# Circuit breaker

The circuit breaker pattern protects an application from repeatedly calling a failing or severely degraded remote dependency. In a distributed system, remote calls fail for reasons including network problems, timeouts, transient unavailability, resource exhaustion, and persistent infrastructure failures. A system that keeps retrying a failing dependency can make things worse: many callers retrying at once exhausts resources and can cascade the failure further.

Retry and circuit breaker solve different parts of this problem: retry helps when a failure is likely temporary; a circuit breaker helps when continuing to call the dependency has a low probability of succeeding at all.

## State machine

```text
               failures >= threshold
        ┌─────────────────────────────┐
        │                             ↓
     CLOSED -----------------------> OPEN
       ↑                              │
       │                              │ timeout
       │ successes                    ↓
       └-------------------------- HALF_OPEN
                                      │
                                      │ failure
                                      └──────> OPEN
```

- **Closed**: requests pass through normally.
- **Open**: requests are rejected immediately (fail fast), without calling the dependency at all.
- **Half-open**: a limited number of trial requests is allowed through. If they succeed, the breaker closes; if a probe fails, it reopens.

## Implementation

```ts
const SUCCESS_THRESHOLD = 3;
const FAILURE_THRESHOLD = 3;
const OPEN_TO_HALF_OPEN_WAIT_TIME = 60_000;

enum CircuitBreakerState {
  Closed,
  Open,
  HalfOpen,
}

export class CircuitBreaker {
  private state = CircuitBreakerState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastError?: Error;
  private nextAttempt = 0;

  exec(next: CallHandler) {
    if (this.state === CircuitBreakerState.Open) {
      if (this.nextAttempt > Date.now()) {
        return throwError(() => this.lastError ?? new Error('Circuit breaker open'));
      }

      this.state = CircuitBreakerState.HalfOpen;
      this.successCount = 0;
    }

    return next.handle().pipe(
      tap({
        next: () => this.handleSuccess(),
        error: (error) => this.handleError(error),
      }),
    );
  }

  private handleSuccess() {
    this.failureCount = 0;

    if (this.state !== CircuitBreakerState.HalfOpen) {
      return;
    }

    this.successCount++;

    if (this.successCount >= SUCCESS_THRESHOLD) {
      this.successCount = 0;
      this.state = CircuitBreakerState.Closed;
    }
  }

  private handleError(error: Error) {
    this.failureCount++;

    if (this.failureCount >= FAILURE_THRESHOLD || this.state === CircuitBreakerState.HalfOpen) {
      this.state = CircuitBreakerState.Open;
      this.successCount = 0;
      this.lastError = error;
      this.nextAttempt = Date.now() + OPEN_TO_HALF_OPEN_WAIT_TIME;
    }
  }
}
```

A subtle bug worth watching for when writing this kind of state machine by hand: incrementing `successCount` from more than one place in the half-open path (e.g. once in a general success handler and again in a half-open-specific branch) silently doubles the counter, so the breaker closes after half the intended number of successful probes. Increment it exactly once, in exactly one place.

## Applying it per handler

```ts
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly circuitBreakerByHandler = new WeakMap<Function, CircuitBreaker>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const methodRef = context.getHandler();
    let circuitBreaker = this.circuitBreakerByHandler.get(methodRef);

    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker();
      this.circuitBreakerByHandler.set(methodRef, circuitBreaker);
    }

    return circuitBreaker.exec(next);
  }
}
```

```ts
@UseInterceptors(CircuitBreakerInterceptor)
@Controller('orders')
export class OrdersController {
  @Get()
  findAll() {
    // ...
  }
}
```

The `WeakMap` gives each handler its own independent breaker state without holding an unnecessary strong reference to the handler function once it's no longer in use elsewhere.

Once the failure threshold trips, subsequent calls get an immediate error without the handler executing at all, until the open-to-half-open wait time elapses and a probe request is allowed through.

## Production considerations

The state machine above is intentionally minimal. A production-grade breaker generally needs to also decide:

- **Which errors actually count as failures.** A client error like `400 Bad Request` usually shouldn't count; a `503`, timeout, `ECONNRESET`, or `ECONNREFUSED` usually should.
- **Time windows and failure rate**, not just a raw consecutive-failure counter.
- **A minimum request volume** before the breaker starts making decisions, so a handful of early failures on a cold start don't trip it prematurely.
- **A call timeout**, limited half-open probe concurrency, backoff, metrics, and state-transition logging.
- **Fallback behavior** for callers when the breaker is open.

Avoid retry amplification, where several architectural layers each independently retry the same failing call, multiplying load on an already-struggling dependency. Placing the breaker as close as possible to the actual remote call, rather than around a whole controller method, is usually the better layering:

```text
Controller → Service → RemoteClient → CircuitBreaker → remote dependency
```

because the breaker then protects the dependency itself, rather than reacting to every exception a handler could possibly throw for unrelated reasons.
