---
name: nestjs-advanced-patterns
description: 'Advanced NestJS internals: explicit vs implicit DI tokens, lazy-loaded modules, runtime container introspection (DiscoveryService, Reflector, MetadataScanner), configurable dynamic modules, mixins and class factories, schematics-based code generation, DI sub-trees via ModuleRef.resolve(), durable providers for multi-tenancy and i18n, worker threads, the circuit breaker pattern, WebSocket gateways, and microservices (TCP, Redis, MQTT, NATS, RabbitMQ, Kafka, gRPC, custom transporters). Use this for NestJS work beyond a standard CRUD module: an unresolved dependency or "Object" token, a module needing register()/forRoot() config, a decorator-driven registry, per-tenant/per-locale isolation, CPU-heavy work blocking the event loop, a degrading remote dependency, enforced code scaffolding, real-time/WebSocket communication, or a service talking to other services over a non-HTTP transport. Also trigger when the user asks which advanced mechanism or transporter fits a problem.'
metadata:
  author: github.com/alpha018
  version: "1.0"
compatibility: For NestJS backend projects. Worker thread examples require Node.js worker_threads (built in) or the optional piscina package; durable provider and schematics examples require the NestJS versions that expose those APIs; WebSocket and microservices examples require @nestjs/websockets or @nestjs/microservices plus whichever transport-specific package (socket.io, ws, ioredis, mqtt, nats, amqplib, kafkajs, @grpc/grpc-js) is actually in use.
---

## Why this exists

Most NestJS work never leaves the standard controller/service/module shape, and that's fine. This skill is for the point past that: when a dependency can't be resolved and the fix isn't obvious, when a module needs to configure itself the way official Nest modules do, when request-scoped providers get expensive, when the transport is no longer plain HTTP (WebSockets, a message broker, gRPC), or when the problem is no longer "how do I wire this service" but "how do I extend the framework itself." Reaching for these tools when a plain provider would do adds real complexity for no benefit, so the first job here is picking the right one, not showing off all of them.

## Ground rule: this is pattern reference, not a checklist to apply wholesale

Every reference file documents a real mechanism with working code, but almost none of them belong in a typical feature module. Before reaching for any of these:

- Confirm the problem actually requires it. A request-scoped or durable provider, a dynamic module, a custom schematic: each solves a specific cost or extensibility problem. If that problem isn't present, a plain `@Injectable()` provider and a static module are simpler and correct.
- Read only the reference file for the mechanism actually needed, not all of them.
- Adapt naming and structure to the project's existing conventions rather than the reference examples.

## Decision guide: which mechanism fits the problem

| Problem | Reach for | Reference |
|---|---|---|
| Nest reports "can't resolve dependencies" or an unresolved `Object` token | Explicit `Symbol`/string DI token with `@Inject()` | `references/dependency-injection-tokens.md` |
| A feature is expensive to initialize and rarely used | `LazyModuleLoader` | `references/lazy-loading-modules.md` |
| Need to discover providers/methods tagged with a custom decorator (plugin systems, schedulers, command buses) | `DiscoveryService` + `Reflector` + `MetadataScanner` | `references/runtime-discovery.md` |
| A module needs `register()`/`forRoot()`-style configuration APIs | `ConfigurableModuleBuilder` | `references/dynamic-modules.md` |
| Need to compose reusable behavior across otherwise unrelated classes | Mixins, or a class factory for a parameterized guard/pipe/interceptor | `references/mixins-and-class-factories.md` |
| Need repeatable, enforced code generation across many services/teams | Schematics | `references/schematics.md` |
| Need to resolve a request-scoped provider outside the normal request lifecycle (e.g. from an event listener) | `ModuleRef.resolve()` with a `ContextId` | `references/di-subtrees.md` |
| Request-scoped providers are getting expensive but the context isn't actually unique per request (tenant, locale) | Durable providers with a custom `ContextIdStrategy` | `references/durable-providers.md` |
| A request handler needs to do CPU-heavy work without blocking the event loop | Worker threads (`worker_threads` or a pool library) | `references/worker-threads.md` |
| A remote dependency is failing repeatedly and retrying makes it worse | Circuit breaker | `references/circuit-breaker.md` |
| Need real-time, bidirectional communication (chat, live updates, presence, multiplayer) | WebSocket gateways | `references/websockets.md` |
| Building a service that talks to other services over something other than plain HTTP (RPC, event streaming, message queues) | Microservices: pick a transporter | `references/microservices-overview.md`, `references/microservices-transporters.md` |

For anything not in this table, a standard provider/module/controller is almost always the right level. Read `references/production-considerations.md` before shipping any of these to production: it collects the mistakes each pattern is most prone to.

## Implementation checklist

1. Identify the actual problem from the table above before picking a mechanism. If nothing in the table matches, don't force one of these patterns onto it.
2. Read only the matching reference file.
3. Check whether the project already has a similar mechanism in place (an existing discovery-based registry, an existing dynamic module) before adding a parallel one.
4. Before shipping, check `references/production-considerations.md` for the specific pattern used.

## Gotchas

- An interface or type alias is erased by TypeScript at compile time and cannot act as a DI token by itself; use a `Symbol`, string, or concrete/abstract class instead, and inject it explicitly with `@Inject()`.
- Request-scoped providers propagate their scope up the dependency chain: if a widely-used provider depends on a request-scoped one, most of that chain becomes request-scoped too, which is expensive at high traffic.
- A `ContextId` only has meaning inside the Nest process that created it. Never pass one across a process boundary (queues, other services); propagate a plain serializable payload instead and reconstruct context on the other side.
- Durable providers reuse a DI sub-tree across requests that share an aggregation key (tenant, locale). This only pays off when that key's cardinality is small and bounded; with a very large or unbounded key space, the durable sub-trees themselves become the expensive thing.
- Never trust a client-supplied header (like a tenant ID) as the aggregation key without authenticating and authorizing it first.
- Worker threads help CPU-bound work (hashing, image processing, heavy parsing); they don't meaningfully help I/O-bound work, which Node already handles efficiently through the event loop.
- A circuit breaker should usually sit as close to the failing remote call as possible (in the client wrapping that call), not wrapped around an entire controller method, so it protects the actual dependency rather than every exception the handler can throw.
- A dynamic-class factory that returns a new class parameterized by an argument (e.g. a pipe factory taking an entity type) is a different pattern from a classic mixin that extends a given base class; both are useful, but they solve different composition problems.
- A WebSocket gateway isn't instantiated until it's referenced in a module's `providers` array, same as any other provider; forgetting this is a common reason a gateway silently never receives connections.
- Filters, pipes, and guards on a gateway must throw `WsException`, not `HttpException`; interceptors need no change at all. Microservice handlers follow the identical rule with `RpcException` instead.
- Each microservice transporter has a different delivery guarantee: TCP/Redis/NATS give effectively none by default, RabbitMQ gives real guarantees only with manual acknowledgment enabled, and Kafka's guarantees depend on partition/offset handling. Picking a transporter without checking this against what the feature actually needs is a common mistake.
