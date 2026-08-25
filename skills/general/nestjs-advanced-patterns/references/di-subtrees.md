# DI sub-trees and ModuleRef

`ModuleRef` lets application code interact directly with Nest's IoC container. It exposes two different ways to get a provider, and the distinction matters:

- **`moduleRef.get()`**: for providers already available in the static/default context (typically singletons).
- **`moduleRef.resolve()`**: constructs or resolves a scoped provider inside a specific DI sub-tree, identified by a `ContextId`.

## Provider scopes

- **`Scope.DEFAULT`**: the usual singleton-like behavior.
- **`Scope.REQUEST`**: one scoped instance per request/Context ID.
- **`Scope.TRANSIENT`**: a new instance per consumer/resolution, per Nest's transient-provider rules.

## Creating and reusing a Context ID

```ts
const contextId = ContextIdFactory.create();
```

A `ContextId` identifies a DI sub-tree. Resolving the same request-scoped provider with the same `ContextId` twice returns the same instance, because both resolutions land in the same sub-tree:

```ts
const [a, b] = await Promise.all([
  moduleRef.resolve(ScopedService, contextId),
  moduleRef.resolve(ScopedService, contextId),
]);

a === b; // true
```

Resolving with two different `ContextId`s gives two independent instances:

```ts
const a = await moduleRef.resolve(ScopedService, ContextIdFactory.create());
const b = await moduleRef.resolve(ScopedService, ContextIdFactory.create());

a === b; // false
```

## Registering a request manually

A manually created `ContextId` has no `REQUEST` object attached by default. `registerRequestByContextId()` attaches one:

```ts
this.moduleRef.registerRequestByContextId({ hello: 'world' }, contextId);
```

## Worked example: passing a Context ID through an event

This example combines DI sub-trees with `@nestjs/event-emitter` to preserve access to request-scoped context when an event is handled by a decoupled listener that runs outside the controller's own call chain.

```ts
@Module({
  imports: [EventEmitterModule.forRoot()],
})
export class AppModule {}
```

```ts
export class PaymentFailedEvent {
  static readonly key = 'PAYMENT_FAILED';

  constructor(
    public readonly paymentId: number,
    public readonly meta: { contextId: ContextId },
  ) {}
}
```

The event carries both domain data (`paymentId`) and infrastructure metadata (`contextId`).

```ts
@Controller('payments-webhook')
export class PaymentsWebhookController {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get()
  webhook(@Req() request: Request) {
    const contextId = ContextIdFactory.create();
    const paymentId = Math.floor(Math.random() * 1000);

    this.moduleRef.registerRequestByContextId(request, contextId);

    this.eventEmitter.emit(PaymentFailedEvent.key, new PaymentFailedEvent(paymentId, { contextId }));
  }
}
```

```ts
@Injectable({ scope: Scope.REQUEST })
export class EventContext {
  constructor(@Inject(REQUEST) public readonly request: Request) {}
}
```

```ts
@Injectable()
export class PaymentNotificationListener {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async sendPaymentNotification(event: PaymentFailedEvent) {
    const context = await this.moduleRef.resolve(EventContext, event.meta.contextId);
    // context.request is the original request, resolved from the same sub-tree
  }
}
```

A second, independent listener can resolve the same context through the same `ContextId`:

```ts
@Injectable()
export class SubscriptionCancellationListener {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async cancelSubscription(event: PaymentFailedEvent) {
    const context = await this.moduleRef.resolve(EventContext, event.meta.contextId);
    // same request-scoped context, resolved independently
  }
}
```

Flow: request → controller creates a `ContextId` and registers the request against it → an event carrying that `ContextId` fires → each independent listener resolves the same request-scoped context by passing the same `ContextId` back into `moduleRef.resolve()`.

Without carrying the `ContextId` through the event, listeners running outside the controller's direct call chain wouldn't automatically resolve against the same request-scoped DI sub-tree; each would either fail to resolve context or, worse, silently resolve an unrelated one.

## Critical limitation: a Context ID is process-local

A `ContextId` is not a distributed correlation ID. It only has meaning inside the Nest process/container that created it. It cannot survive a hop through a message broker or another process:

```text
process A creates ContextId
     ↓
message broker
     ↓
process B receives the message
     ↓
that ContextId means nothing in process B
```

Across process boundaries, propagate a plain serializable payload instead (tenant ID, user ID, correlation ID, locale) and reconstruct the appropriate application context in the consumer.

## Architectural coupling

Embedding Nest's `ContextId` directly inside a domain event couples that event to Nest's own infrastructure. In Clean Architecture or DDD-style systems, prefer keeping domain events infrastructure-independent: wrap the event in an application/infrastructure envelope, or place framework-specific context metadata outside the domain payload entirely.

## Security and memory

Don't hand the complete HTTP request object to every downstream listener by default. A request can carry headers, tokens, cookies, and other sensitive data that most listeners don't need. Prefer minimizing the context object to what a given handler actually requires.
