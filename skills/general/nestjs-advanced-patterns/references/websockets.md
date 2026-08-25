# WebSocket gateways

Real-time, bidirectional communication needs a different toolkit than request/response HTTP: a long-lived connection, message-based routing instead of route-based routing, and its own exception type. Nest wraps this in gateways, which stay platform-agnostic (socket.io by default, the lighter `ws` library as a built-in alternative, or a fully custom transport) while reusing the same filters, pipes, guards, and interceptors used elsewhere in the app.

## Setting up a gateway

```bash
npm i --save @nestjs/websockets @nestjs/platform-socket.io
```

A gateway is a class decorated with `@WebSocketGateway()`, registered as a provider like any other:

```ts
@WebSocketGateway(80, { namespace: 'orders' })
export class OrdersGateway {}
```

```ts
@Module({
  providers: [OrdersGateway],
})
export class OrdersModule {}
```

The first argument is a port; the second is an options object accepting a `namespace` and any underlying socket.io server option (e.g. `{ transports: ['websocket'] }`). By default, a gateway listens on the same port as the HTTP server unless the app isn't a web application or the port was set explicitly.

A gateway is not instantiated until it's referenced in a module's `providers` array, same as any other provider: forgetting to register it is a common reason a gateway silently never receives connections.

## Handling messages

```ts
@SubscribeMessage('order-status')
handleOrderStatus(@MessageBody() data: string): string {
  return data;
}
```

`@MessageBody()` extracts the message payload; a key argument (`@MessageBody('orderId')`) extracts one property from it. `@ConnectedSocket()` gives access to the active socket instance when a handler needs it, which is preferable to declaring an untyped `client` parameter directly. `@WebSocketServer()` injects the underlying server (or, for a namespaced gateway, the `Namespace` instance) as a class property:

```ts
@WebSocketGateway({ namespace: 'orders' })
export class OrdersGateway {
  @WebSocketServer()
  namespace: Namespace;
}
```

### Responding to a message

Returning a value from a handler sends it back as an implicit acknowledgment:

```ts
socket.emit('order-status', { orderId }, (response) => console.log(response));
```

For explicit control over the acknowledgment, inject it with `@Ack()`:

```ts
@SubscribeMessage('order-status')
handleOrderStatus(@MessageBody() data: string, @Ack() ack: (response: unknown) => void) {
  ack({ status: 'received', data });
}
```

To emit under a different event name than the one that triggered the handler, or to emit more than once, return a `WsResponse` (or an array/stream of them) instead:

```ts
@SubscribeMessage('order-status')
handleOrderStatus(@MessageBody() data: unknown): WsResponse<unknown> {
  return { event: 'order-status-ack', data };
}
```

Handlers can be `async` or return an `Observable`. A returned `Observable` emits a separate response for each value it produces, which is the natural fit for a handler that needs to stream several messages back from one incoming event rather than send a single reply:

```ts
@SubscribeMessage('order-status')
streamOrderStatus(@MessageBody() data: unknown): Observable<WsResponse<number>> {
  return from([1, 2, 3]).pipe(map((data) => ({ event: 'order-status-ack', data })));
}
```

Returning `undefined` or another falsy value skips sending a response at all.

## Connection lifecycle

```ts
export class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  afterInit(server: Server) {}
  handleConnection(client: Socket) {}
  handleDisconnect(client: Socket) {}
}
```

`afterInit` runs once, after the underlying server is initialized. `handleConnection`/`handleDisconnect` run per client, on connect and disconnect respectively. This is the usual place to authenticate a new connection, track connected clients, or join a client to rooms.

## Filters, pipes, guards, and interceptors on a gateway

Every one of these applies to a gateway exactly the way it applies to an HTTP controller, with one consistent difference: throw `WsException` (from `@nestjs/websockets`) instead of `HttpException`. `@UseFilters()`, `@UsePipes()`, `@UseGuards()`, and `@UseInterceptors()` all work at both the method level (on a single `@SubscribeMessage()` handler) and the class level (on the whole gateway).

**Exception filters.** A `WsException` produces a structured error response (`{ status: 'error', message: '...' }`) sent back over the socket instead of an HTTP status. Extend `BaseWsExceptionFilter` to add custom handling while keeping the framework's default behavior:

```ts
@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
    // custom logging, metrics, etc.
  }
}
```

**Pipes.** Functionally identical to HTTP pipes, with one restriction: a pipe only applies to the message payload, not to the client/socket instance, since validating or transforming the socket itself isn't meaningful. Overriding `exceptionFactory` is what makes a validation pipe throw the right exception type here:

```ts
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }))
@SubscribeMessage('order-status')
handleOrderStatus(@MessageBody() data: unknown): WsResponse<unknown> {
  return { event: 'order-status-ack', data };
}
```

**Guards.** No structural difference from an HTTP guard beyond the exception type:

```ts
@UseGuards(WsAuthGuard)
@SubscribeMessage('order-status')
handleOrderStatus(@MessageBody() data: unknown): WsResponse<unknown> {
  return { event: 'order-status-ack', data };
}
```

**Interceptors.** No difference at all from an HTTP interceptor; the same class works unmodified on a gateway handler.

## Choosing an adapter

| | `IoAdapter` (default, socket.io) | `WsAdapter` (`ws` library) |
|---|---|---|
| Protocol | socket.io protocol (polling fallback, rooms, namespaces) | native browser WebSocket |
| Performance | good | better, since there's no protocol overhead beyond the WebSocket handshake |
| Features out of the box | rooms, namespaces, automatic reconnection, acknowledgments | minimal; namespaces aren't supported natively |
| When to use | rich client/server feature needs, or when socket.io's browser fallback behavior matters | raw performance matters more than built-in features, or the client already speaks plain WebSocket |

Both need to be applied explicitly at bootstrap:

```ts
app.useWebSocketAdapter(new WsAdapter(app));
```

`IoAdapter` can be extended for cases like Redis-backed pub/sub across multiple load-balanced instances (overriding `createIOServer()`). Running socket.io behind a load balancer needs one of: disabling the HTTP long-polling fallback client-side (`transports: ['websocket']`), or enabling cookie-based sticky routing on the load balancer, since polling depends on repeated requests reaching the same backend instance.

`WsAdapter` accepts a custom `messageParser` (in its constructor, or later via `setMessageParser()`) for controlling exactly how incoming raw messages are decoded into an event/payload pair.

A fully custom transport implements the `WebSocketAdapter` interface directly: `create()` (build a socket instance), `bindClientConnect()`, `bindClientDisconnect()` (optional), `bindMessageHandlers()` (route incoming messages to the right handler), and `close()`.

## How this connects to the rest of this skill

- A gateway handler that does real CPU-heavy work (encoding, large-scale processing) blocks the event loop exactly like an HTTP handler would; see `references/worker-threads.md`.
- A gateway that calls out to a flaky external dependency needs the same protection an HTTP client would; see `references/circuit-breaker.md`.
- Nest's standard request-scoped provider machinery (`@Inject(REQUEST)`) is built around the HTTP request lifecycle and doesn't map directly onto a long-lived socket connection. Per-connection context (the authenticated user, a tenant, a locale) is more naturally attached to the socket itself during `handleConnection`, or resolved through `ModuleRef.resolve()` with a `ContextId` created for that connection; see `references/di-subtrees.md` for the underlying mechanism.
- If a gateway needs to configure itself with options at import time (e.g. a shared or reusable WebSocket module), the same `ConfigurableModuleBuilder` pattern from `references/dynamic-modules.md` applies unchanged.
