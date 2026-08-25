# Choosing a microservice transporter

Read `references/microservices-overview.md` first for the shared concepts (message vs. event patterns, `ClientProxy`, request scope). This file covers what actually differs between transporters, so the right one gets picked instead of defaulting to whichever is most familiar.

## Decision guide

| Need | Reach for | Why |
|---|---|---|
| Simple point-to-point RPC between two NestJS services, no broker to run | TCP | Built in, zero extra infrastructure, no delivery guarantees beyond the connection itself |
| Fire-and-forget pub/sub, already running Redis | Redis | Simple, fast, but messages with no subscriber are dropped; no delivery guarantee |
| IoT/device messaging, lightweight clients, topic wildcards | MQTT | Designed for constrained clients and hierarchical topics (`sensors/+/temperature/#`) |
| Lightweight pub/sub or request-reply with queue-group load balancing, need low latency | NATS | Simple, fast; request-response is emulated (not NATS' native request-reply), queue groups give you load-balanced consumers |
| Reliable delivery, message acknowledgment, complex routing (topic/fanout exchanges) | RabbitMQ | Manual ack mode plus persistent messages give real delivery guarantees; more operational overhead than Redis/NATS |
| High-throughput event streaming, replay, strict ordering per partition, consumer groups | Kafka | Built for large-scale event streams and replay, not simple RPC; has real operational weight (partitions, consumer groups, offsets) |
| Strongly-typed contracts across polyglot services, streaming RPC | gRPC | Proto-defined contracts, native streaming, works well across languages; adds a build step for generated types |
| None of the built-in transporters fit (a proprietary protocol, an unusual broker) | A custom transporter | See "Custom transporters" below |

## TCP

No extra dependency beyond `@nestjs/microservices` itself.

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.TCP,
  options: { host: 'localhost', port: 3001, retryAttempts: 5, retryDelay: 3000 },
});
```

No delivery guarantees beyond the TCP connection; if the connection drops mid-request, the caller sees a failure, nothing more.

## Redis

```bash
npm i --save ioredis
```

```ts
options: { host: 'localhost', port: 6379 }
```

Pure pub/sub: a message with no active subscriber is discarded, and multiple subscribers all receive the same message. Enable `wildcards: true` for pattern-based subscriptions (`psubscribe`) if event patterns need wildcard matching.

```ts
@MessagePattern('orders.notifications')
getNotifications(@Payload() data: unknown, @Ctx() context: RedisContext) {
  const channel = context.getChannel();
}
```

## MQTT

```bash
npm i --save mqtt
```

```ts
options: { url: 'mqtt://localhost:1883', subscribeOptions: { qos: 2 } }
```

Supports single-level (`+`) and multi-level (`#`) topic wildcards:

```ts
@MessagePattern('orders/+/status/#')
getOrderStatus(@Ctx() context: MqttContext) {
  const topic = context.getTopic();
}
```

Per-pattern QoS overrides the global default via `@EventPattern('orders.shipped', { extras: { qos: 2 } })`. `MqttRecordBuilder` lets a client set QoS, retain, and custom headers on an outgoing message:

```ts
const record = new MqttRecordBuilder(payload).setQoS(1).setProperties({ userProperties: { 'x-order-id': orderId } }).build();
client.send('order-status-update', record).subscribe();
```

## NATS

```bash
npm i --save nats
```

```ts
options: { servers: ['nats://localhost:4222'] }
```

Request-response over NATS is emulated by Nest (publish plus a unique reply subject), not NATS' native request-reply mechanism. `queue` enables load-balanced consumer groups:

```ts
options: { servers: ['nats://localhost:4222'], queue: 'orders_queue' }
```

Wildcard subscriptions and per-message headers (via `NatsRecordBuilder`) are also supported, structurally the same as MQTT's pattern above.

## RabbitMQ

```bash
npm i --save amqplib amqp-connection-manager
```

```ts
options: {
  urls: ['amqp://localhost:5672'],
  queue: 'orders_queue',
  queueOptions: { durable: false },
}
```

The transporter with the strongest delivery guarantees here: set `noAck: false` for manual acknowledgment, and explicitly ack processed messages so a crash before processing completes leaves the message requeued instead of lost:

```ts
@MessagePattern('orders.notifications')
getNotifications(@Payload() data: unknown, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  channel.ack(originalMsg);
}
```

`wildcards: true` enables topic-exchange routing (`orders.#` matches `orders.created` and `orders.created.notified`).

## Kafka

```bash
npm i --save kafkajs
```

```ts
options: { client: { brokers: ['localhost:9092'] }, consumer: { groupId: 'orders-consumer' } }
```

Request-response over Kafka needs a reply topic subscribed before sending, and at least one partition per running application instance on that reply topic, or launching multiple instances breaks:

```ts
onModuleInit() {
  this.client.subscribeToResponseOf('orders.process_payment');
}
```

Unhandled exceptions are automatically wrapped into an `RpcException`; for event-based handlers, an unhandled exception triggers a retry by default. Throw `KafkaRetriableException` to opt out of that default and handle retry logic explicitly (e.g. in a custom exception filter that tracks a retry count and stops retrying past a threshold). Disable `run: { autoCommit: false }` and commit offsets manually when processing needs to control exactly when a message is considered handled.

## gRPC

```bash
npm i --save @grpc/grpc-js @grpc/proto-loader
```

Contract-first: define the service in a `.proto` file, and configure `nest-cli.json` to copy it (`"assets": ["**/*.proto"]`).

```protobuf
syntax = "proto3";
package orders;

service OrdersService {
  rpc FindOne (OrderById) returns (Order) {}
}
```

```ts
options: { package: 'orders', protoPath: join(__dirname, 'orders/orders.proto') }
```

```ts
@GrpcMethod('OrdersService', 'FindOne')
findOne(data: OrderById): Order {
  return orders.find(({ id }) => id === data.id);
}
```

Client side, the service is resolved from the generated definition, not injected as a plain provider:

```ts
constructor(@Inject('ORDERS_PACKAGE') private readonly client: ClientGrpc) {}

onModuleInit() {
  this.ordersService = this.client.getService<OrdersServiceClient>('OrdersService');
}
```

Streaming (`@GrpcStreamMethod()` for a full-duplex Observable-based handler, `@GrpcStreamCall()` for raw stream events) is native to gRPC's proto contract, unlike the other transporters, where any equivalent has to be built on top.

## Custom transporters

When none of the above fit, implement `CustomTransportStrategy` and extend `Server` from `@nestjs/microservices`:

- **`listen(callback)`**: called on `app.listen()`; open the connection to the messaging system and register subscribers here.
- **`close()`**: called on shutdown; unsubscribe and close the connection.
- **`on(event, callback)`** (optional): skip it if transporter users shouldn't be able to register their own event listeners.
- **`unwrap<T>()`** (optional): skip it if transporter users shouldn't get access to the underlying native client/server.

A handler's return value can be an `Observable`; a custom transporter is responsible for subscribing to it itself to actually run the underlying logic, since nothing else does that automatically outside Nest's own built-in transporters:

```ts
if (isObservable(streamOrResult)) {
  streamOrResult.subscribe();
}
```
