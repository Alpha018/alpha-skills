# Microservices: core concepts

A NestJS microservice is an application using a transport layer other than HTTP. The same building blocks (controllers, providers, DI, filters, pipes, guards, interceptors) work unchanged; only how a request arrives and how a response gets sent differ. Nest ships several built-in transporters (TCP, Redis, MQTT, NATS, RabbitMQ, Kafka, gRPC, see `references/microservices-transporters.md` for choosing between them) and supports a fully custom one.

## Installation and bootstrap

```bash
npm i --save @nestjs/microservices
```

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.TCP,
});
await app.listen();
```

## Request-response vs. event-based messaging

Two distinct communication styles, chosen per message, not per application:

**Request-response** (`@MessagePattern()`), for when the caller needs a reply and delivery confirmation:

```ts
@Controller()
export class OrdersController {
  @MessagePattern({ cmd: 'get_order_total' })
  getOrderTotal(data: number[]): number {
    return (data || []).reduce((a, b) => a + b, 0);
  }
}
```

A handler can return synchronously, `async`/`Promise`, or an `Observable` (each emitted value becomes a separate response).

**Event-based** (`@EventPattern()`), for publishing something without waiting for a reply:

```ts
@EventPattern('order_created')
async handleOrderCreated(data: Record<string, unknown>) {
  // react to the event; no response is sent back
}
```

Multiple handlers can subscribe to the same event pattern; all of them run.

## Calling a microservice: `ClientProxy`

Register a client and inject it:

```ts
@Module({
  imports: [ClientsModule.register([{ name: 'ORDERS_SERVICE', transport: Transport.TCP }])],
})
export class AppModule {}
```

```ts
constructor(@Inject('ORDERS_SERVICE') private readonly client: ClientProxy) {}
```

`send()` targets a `@MessagePattern()` and returns a **cold** Observable, meaning nothing happens until something subscribes to it:

```ts
getOrderTotal(): Observable<number> {
  return this.client.send<number>({ cmd: 'get_order_total' }, [10, 20, 30]);
}
```

`emit()` targets an `@EventPattern()` and returns a **hot** Observable, meaning it attempts delivery immediately regardless of whether anything subscribes:

```ts
async publishOrderCreated() {
  this.client.emit('order_created', new OrderCreatedEvent());
}
```

## Reading transport-specific context

`@Payload()` extracts the message body (optionally by key, e.g. `@Payload('id')`); `@Ctx()` gives access to transport-specific metadata through a context object specific to the transporter in use (e.g. `NatsContext`, `KafkaContext`, `RmqContext`, covered per-transporter in `references/microservices-transporters.md`).

## Request-scoped handlers

A `Scope.REQUEST` provider can read the current message's pattern and payload via the `CONTEXT` token:

```ts
@Injectable({ scope: Scope.REQUEST })
export class OrdersService {
  constructor(@Inject(CONTEXT) private readonly ctx: RequestContext) {}
}
```

```ts
interface RequestContext<T = any> {
  pattern: string | Record<string, any>;
  data: T;
}
```

The same cost tradeoff from `references/di-subtrees.md` and `references/durable-providers.md` applies here: request scope adds overhead per message, and durable providers are worth considering if messages naturally aggregate by some bounded key.

## Connection lifecycle

A `ClientProxy` connects lazily before its first call and reuses the connection afterward. To connect eagerly (e.g. to fail fast at startup instead of on first use):

```ts
async onApplicationBootstrap() {
  await this.client.connect();
}
```

Monitor connection health:

```ts
this.client.status.subscribe((status) => console.log(status));
this.client.on('error', (err) => console.error(err));
```

## Timeouts

`send()` doesn't time out on its own; wrap it with RxJS's `timeout` operator:

```ts
this.client.send(pattern, data).pipe(timeout(5000));
```

Without this, a request to an unresponsive service hangs indefinitely from the caller's perspective.

## TLS and dynamic configuration

TLS options (`tlsOptions` with `key`/`cert` server-side, `ca` client-side) are available on transporters that support it (TCP shown here; see the per-transporter reference for others). For configuration that depends on `ConfigService` or other providers, use the async factory form instead of a static options object:

```ts
const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(AppModule, {
  useFactory: (configService: ConfigService) => ({
    transport: Transport.TCP,
    options: { host: configService.get('HOST'), port: configService.get('PORT') },
  }),
  inject: [ConfigService],
});
```
