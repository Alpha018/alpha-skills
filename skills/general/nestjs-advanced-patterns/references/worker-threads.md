# Worker threads for CPU-bound work

Worker threads solve a different class of problem than normal async I/O. Node.js documents workers as useful primarily for CPU-intensive JavaScript work; they generally don't help I/O-bound operations, because Node already handles async I/O efficiently through the event loop, libuv, and the OS.

## CPU-bound vs I/O-bound

I/O-bound work (HTTP requests, database queries, Redis, async filesystem access, object storage, message brokers) already runs efficiently through the event loop:

```text
Event Loop → async I/O → libuv / OS
```

Worker threads don't materially improve this kind of workload.

CPU-bound work (compression, image processing, heavy hashing, video processing, cryptography, large-scale parsing, mathematical workloads) blocks the single-threaded event loop while it runs:

```text
Without workers:
main thread → heavy CPU operation → event loop blocked

With a worker pool:
main event loop → worker pool → { thread 1, thread 2, ..., thread N }
```

Each worker has its own V8 environment, JavaScript execution context, event loop, and event queue. Workers exchange data via message passing, and can share or transfer memory through `ArrayBuffer`, transferables, and `SharedArrayBuffer` when that's actually needed.

## Using a worker pool library

A pool library (such as Piscina) absorbs most of the complexity of worker creation, reuse, pooling, scheduling, queuing, and concurrency management:

```ts
@Controller('cpu-task')
export class CpuTaskController {
  worker = new Piscina({ filename: resolve(__dirname, 'cpu-task.worker.js') });

  @Get()
  run(@Query('n') n = 10) {
    return this.worker.run(n);
  }
}
```

```ts
// cpu-task.worker.js
function heavyComputation(n) {
  // CPU-intensive work
}

module.exports = (n) => heavyComputation(n);
```

## Building a manual worker host instead

More control, more responsibility: manage the worker's lifecycle and message correlation directly.

```ts
@Injectable()
export class CpuTaskWorkerHost implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker: Worker;
  private message$: Observable<{ id: string; result: unknown }>;

  onApplicationBootstrap() {
    this.worker = new Worker(join(__dirname, 'cpu-task.worker.js'));
    this.message$ = fromEvent(this.worker, 'message') as Observable<{ id: string; result: unknown }>;
  }

  async onApplicationShutdown() {
    await this.worker?.terminate();
  }

  run(input: unknown) {
    const id = randomUUID();
    this.worker.postMessage({ input, id });

    return firstValueFrom(this.message$.pipe(filter((m) => m.id === id), map((m) => m.result)));
  }
}
```

This builds a small request-response protocol over `postMessage`: an ID tags each job so the correct response can be matched back to the correct caller, since multiple jobs can be in flight on the same worker at once.

The worker side has to speak the same message-based protocol:

```ts
// cpu-task.worker.js
import { parentPort } from 'node:worker_threads';

parentPort?.on('message', ({ input, id }) => {
  const result = heavyComputation(input);
  parentPort?.postMessage({ id, result });
});
```

A worker written for a pool library (which typically exports a plain function) is not automatically compatible with a manual `Worker` host: the two use different execution and message contracts. Pick one approach and write the worker file to match it.

`worker.terminate()` is asynchronous; await it during shutdown rather than firing and forgetting.

## Manual worker vs. a pool library

| Aspect | Manual `Worker` | Pool library |
|---|---|---|
| Control | Maximum | High |
| Pooling | Manual | Built in |
| Message correlation | Manual | Abstracted |
| Backpressure | Manual | Easier to manage |
| Scheduling | Manual | Built in |
| Lifecycle | Manual | Simplified |
| Ease of use | Lower | Higher |

For production workloads with many concurrent CPU-heavy jobs, a worker pool is usually preferable to creating one worker per request, or funneling everything through a single permanent worker.

## Production considerations

A robust implementation should account for: timeouts, cancellation, worker `error` and `exit` events, concurrency limits, backpressure, pool sizing, clean shutdown, observability, queue depth, serialization overhead, transferables for large binary payloads, and `SharedArrayBuffer` only when actual shared memory is genuinely necessary.

Also validate and coerce any external input (like a numeric query parameter) before it reaches the worker; don't assume it arrives as the right type.
