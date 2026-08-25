# nestjs-advanced-patterns

### Know which advanced NestJS mechanism actually fits the problem, and when none of them do

NestJS exposes a set of powerful internals beyond the standard controller/service/module shape: dynamic modules, request-scoped and durable providers, runtime container introspection, lazy loading, mixins, schematics, plus two full feature areas of their own, WebSocket gateways and microservices. Each mechanism solves a real problem well and adds real complexity everywhere else. This skill exists so an agent reaches for the right one, for the right reason, instead of either reinventing what one of these already does or reaching for one where a plain provider (or a simpler transporter) would have been correct.

> [!TIP]
> This is reference material to consult selectively, not a checklist to work through top to bottom. Start from the decision table in [`SKILL.md`](SKILL.md), read only the reference file it points to, and skip the rest.

## What you get when this triggers

The core of this skill is a single decision table in [`SKILL.md`](SKILL.md) mapping a concrete problem ("Nest reports an unresolved `Object` token," "a request-scoped provider is getting expensive but the context isn't actually unique per request," "a remote dependency keeps failing and retries are making it worse") to the specific mechanism that addresses it, and the reference file with the working implementation.

Concretely, this means:

- **A diagnosis before a solution.** For a confusing DI resolution error, the skill explains why it's happening (usually an interface being erased at compile time) before reaching for a fix.
- **Working NestJS code for exactly the mechanism needed**, not a tour of every advanced feature because one of them showed up in a request.
- **The parts that are easy to get subtly wrong.** A circuit breaker's success counter incremented from two places, a durable provider's aggregation key trusted from an unauthenticated header, a `ContextId` treated as if it worked across a process boundary, a worker written for the wrong execution contract.
- **An explicit "don't" alongside every "do."** Several of these patterns (request scope, dynamic modules, durable providers) are genuinely more complex than the plain alternative, and the skill says so rather than presenting every mechanism as equally appropriate.

## What's in the box

| File | What it has |
|---|---|
| [`SKILL.md`](SKILL.md) | The problem-to-mechanism decision table, an implementation checklist, and cross-cutting gotchas |
| [`references/dependency-injection-tokens.md`](references/dependency-injection-tokens.md) | Why interfaces can't be DI tokens, explicit vs implicit injection, token organization, circular-dependency detection |
| [`references/lazy-loading-modules.md`](references/lazy-loading-modules.md) | `LazyModuleLoader`, and when lazy loading actually pays off |
| [`references/runtime-discovery.md`](references/runtime-discovery.md) | `DiscoveryService`, `Reflector`, `MetadataScanner` for decorator-driven registries and schedulers |
| [`references/dynamic-modules.md`](references/dynamic-modules.md) | `ConfigurableModuleBuilder`, `register()`/`forRoot()`-style configuration APIs |
| [`references/mixins-and-class-factories.md`](references/mixins-and-class-factories.md) | Behavior composition via mixins, and the distinct pattern of a parameterized class factory |
| [`references/schematics.md`](references/schematics.md) | Template- and AST-based code generation for enforced, organization-wide scaffolding |
| [`references/di-subtrees.md`](references/di-subtrees.md) | `ModuleRef.resolve()` and `ContextId`, including passing request-scoped context through an event to a decoupled listener |
| [`references/durable-providers.md`](references/durable-providers.md) | Aggregating request-scoped providers by tenant or locale instead of paying the per-request cost |
| [`references/worker-threads.md`](references/worker-threads.md) | Offloading CPU-bound work off the event loop, worker pools vs. a manual `Worker` host |
| [`references/circuit-breaker.md`](references/circuit-breaker.md) | The resilience pattern for a degrading remote dependency, and its state machine |
| [`references/websockets.md`](references/websockets.md) | Gateways, message handling, connection lifecycle, filters/pipes/guards/interceptors on a gateway, and choosing between `IoAdapter`, `WsAdapter`, and a custom adapter |
| [`references/microservices-overview.md`](references/microservices-overview.md) | Message vs. event patterns, `ClientProxy`, request-scoped handlers, connection lifecycle, timeouts |
| [`references/microservices-transporters.md`](references/microservices-transporters.md) | A decision table across TCP, Redis, MQTT, NATS, RabbitMQ, Kafka, and gRPC, plus how to build a custom transporter |
| [`references/microservices-cross-cutting.md`](references/microservices-cross-cutting.md) | Filters, pipes, guards, and interceptors on a microservice handler, and the `RpcException` requirement |
| [`references/production-considerations.md`](references/production-considerations.md) | A checklist of the specific mistakes each pattern above is most prone to |
| [`evals/evals.json`](evals/evals.json) | Eval cases checking that the skill picks the right mechanism (or correctly recommends against one) for the scenario |
| [`evals/trigger-eval.json`](evals/trigger-eval.json) | Should-trigger / should-not-trigger prompts used to validate the skill's description |

## What this skill won't do

It won't reach for request scope, a dynamic module, or a custom schematic just because the request mentions something adjacent. If a plain provider and a static module already solve the problem, the skill says so instead of introducing one of these mechanisms for its own sake.
