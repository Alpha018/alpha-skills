# Production considerations by pattern

A checklist of the mistakes each pattern in this skill is most prone to. Check the row for whatever was actually implemented.

| Pattern | Watch for |
|---|---|
| Circuit breaker | A success or failure counter incremented from more than one code path, silently doubling the effective threshold. |
| Circuit breaker | Every exception treated as a breaker failure, including client errors that shouldn't count. |
| Circuit breaker | The breaker wrapped around a whole controller method instead of the specific remote call it's meant to protect. |
| Circuit breaker | No limit on concurrent half-open probe requests. |
| Worker threads | A worker written for a pool library reused with a manual `Worker` host, or vice versa; the two use different message contracts. |
| Worker threads | `worker.terminate()` not awaited during shutdown. |
| Worker threads | External input (like a query parameter) passed to a worker without validating or coercing its type first. |
| Lazy loading | Infrastructure that needs to exist at bootstrap accidentally deferred behind lazy loading. |
| Lazy loading | A frequently used module lazy-loaded for no real benefit, just added async indirection. |
| Runtime discovery | `DiscoveryModule` not imported where the current Nest version/configuration requires it for `DiscoveryService` to work. |
| Runtime discovery | Deprecated `NodeJS.Timer` typing used instead of `NodeJS.Timeout` / `ReturnType<typeof setInterval>`. |
| Mixins / class factories | A parameterized class factory described and used as if it were a classic mixin; the two compose differently. |
| Mixins / class factories | `@Inject(entityCls)` assumed to be a valid repository token without resolving the ORM's actual token for that entity. |
| Mixins / class factories | An ORM existence check assumed to throw on a miss when it actually returns a boolean. |
| Schematics | AST edits relying on fragile positional offsets (`node.end - N`) instead of semantic transformation. |
| Schematics | Deep imports into a schematics library's internal paths instead of its public exports. |
| DI sub-trees | A `ContextId` treated as if it were valid across a process boundary (a queue, another service). |
| DI sub-trees | The full HTTP request object passed to every downstream consumer instead of the minimal context each one needs. |
| Durable providers | `REQUEST` inside a durable sub-tree assumed to be the raw HTTP request; it's whatever payload the strategy attached, which may be synthetic. |
| Durable providers | A client-supplied header (like a tenant ID) trusted as the aggregation key without authentication and authorization first. |
| Durable providers | Durable aggregation applied to a key with very large or unbounded cardinality, making the durable sub-trees themselves expensive. |
| Durable providers | An in-memory cache eviction (like deleting a `Map` entry after a timeout) treated as equivalent to formally destroying a Nest DI sub-tree. |
| i18n | A basic interpolation library assumed to cover plural rules, number/date/currency formatting, and other full-i18n concerns it doesn't handle. |
| Configurable modules | `alwaysTransient` enabled without a specific reason for distinct dynamic-module identities. |
| Configurable modules | `this` accessed before `super()` runs in a class extending `ConfigurableModuleClass`. |
| WebSockets | A gateway not registered in a module's `providers` array, so it never receives connections. |
| WebSockets | An `HttpException` thrown from a gateway filter, pipe, or guard instead of `WsException`. |
| WebSockets | socket.io run behind a load balancer without disabling HTTP long-polling or enabling sticky routing, breaking multi-instance connections. |
| Microservices | An `HttpException` thrown from a microservice filter, pipe, or guard instead of `RpcException`. |
| Microservices | A transporter picked without checking its actual delivery guarantees (TCP/Redis/NATS give effectively none by default) against what the feature needs. |
| Microservices | RabbitMQ used with `noAck` left in auto-ack mode when the workload actually needs at-least-once delivery. |
| Microservices | Kafka request-response wired up without enough reply-topic partitions for every running application instance. |
| Microservices | `client.send()` called without a `timeout()` operator, leaving a caller waiting indefinitely on an unresponsive service. |

## General principle behind most of these

Almost every item above is a case of trusting an assumption instead of checking it: that a counter is only ever incremented in one place, that a token maps to what it looks like it maps to, that a boolean return means something never throws, that a context object survives past the boundary it was created in. These patterns all operate below the level most application code touches, so a wrong assumption here tends to surface much later, and much more confusingly, than a similar mistake in ordinary business logic.
