# Durable providers

Request-scoped providers give per-request isolation, but they cost more than default-scoped ones: `Scope.REQUEST` also propagates up the dependency chain, so if a widely used provider depends on a request-scoped one, a large part of the graph gets rebuilt on every request. That's expensive in memory churn and latency at meaningful traffic.

## The problem durable providers solve

Ordinary request scope gives every request its own isolated sub-tree, even when many requests actually share the same relevant contextual property:

```text
Ordinary request scope:
request 1 → sub-tree 1
request 2 → sub-tree 2
request 3 → sub-tree 3

Durable aggregation:
request (tenant 1) ─┐
request (tenant 1) ─┼──> one durable sub-tree for tenant 1
request (tenant 1) ─┘
```

Durable providers let requests be aggregated by a shared key (tenant, locale, region, product tier) and reuse one DI sub-tree per key value, instead of building a fresh one per request. Durability propagates through the dependency chain similarly to request scope: if a component depends on a durable provider, the relevant part of the tree becomes durable too, unless a component explicitly opts out with `durable: false`.

A durable provider is only worth it when the aggregation key has small, bounded cardinality. With an unbounded key (a truly per-request or unpredictable value), there's nothing to aggregate and durability adds complexity for no benefit. With a very large key space (millions of distinct values), the durable sub-trees themselves become the expensive thing, defeating the purpose.

## Marking a provider durable

```ts
@Injectable({ scope: Scope.REQUEST, durable: true })
export class TenantDataSourceService {
  constructor(@Inject(REQUEST) private readonly requestContext: unknown) {}
}
```

The combination `scope: Scope.REQUEST, durable: true` marks the provider as request-scoped but eligible for durable sub-tree aggregation, once a `ContextIdStrategy` (below) says it should aggregate.

## Worked example: aggregating by tenant

A `ContextIdStrategy` decides which `ContextId` a given request should actually resolve against:

```ts
export class AggregateByTenantContextIdStrategy implements ContextIdStrategy {
  private readonly tenants = new Map<string, ContextId>();

  attach(contextId: ContextId, request: Request): ContextIdResolverFn | ContextIdResolver {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return () => contextId; // no tenant: keep the normal per-request context
    }

    let tenantSubTreeId: ContextId;

    if (this.tenants.has(tenantId)) {
      tenantSubTreeId = this.tenants.get(tenantId)!;
    } else {
      tenantSubTreeId = ContextIdFactory.create();
      this.tenants.set(tenantId, tenantSubTreeId);
    }

    return {
      payload: { tenantId },
      resolve: (info: HostComponentInfo) => (info.isTreeDurable ? tenantSubTreeId : contextId),
    };
  }
}
```

What this does: Nest calls `attach()` with the normal per-request `contextId` and the incoming `request`. The strategy extracts a tenant ID, reuses a cached `ContextId` for that tenant if one already exists (or creates and caches one), and returns a `resolve` function. That function is what decides, per component, whether to use the tenant's durable sub-tree (`isTreeDurable === true`) or fall back to the ordinary per-request context. This is what lets only the providers actually marked `durable: true` get aggregated, while ordinary request-scoped providers keep their normal per-request isolation.

The `payload` returned here (`{ tenantId }`) is what a durable provider receives via `@Inject(REQUEST)`, not the raw HTTP request:

```ts
@Inject(REQUEST) private readonly payload: { tenantId: string }
```

`REQUEST` inside a durable sub-tree is not necessarily `Express.Request`; it can be a synthetic context object like this one.

Apply the strategy once, before the application starts accepting requests:

```ts
async function bootstrap() {
  ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```

Result: requests sharing the same tenant reuse the same durable sub-tree and its `TenantDataSourceService` instance; a different tenant gets its own.

### Multi-tenant security

Never trust a client-supplied header like `x-tenant-id` on its own. A safer flow verifies a signed credential (a JWT, for example) and derives the tenant from its verified claims, then checks the caller's actual membership in that tenant, before that value ever reaches the `ContextIdStrategy`:

```text
signed credential → signature verification → claims → verified tenant membership → ContextIdStrategy
```

not:

```text
arbitrary header → straight to tenant selection
```

Treat tenant isolation as needing defense in depth: authentication, authorization, tenant validation, actual datasource/schema/database segregation, and periodic tenant-isolation testing, not just this one aggregation strategy.

### A cache-expiry detail worth calling out

A tenant-to-`ContextId` cache like the `Map` above sometimes gets a naive expiry added, e.g. deleting an entry after a timeout. That's a cache-eviction detail for that in-memory `Map`, not a way to formally destroy a Nest DI sub-tree. What actually happens to the sub-tree's lifecycle and garbage collection still depends on all remaining references to it elsewhere in the application.

## Worked example: aggregating by locale (i18n)

Internationalization (i18n) is a strong fit for durable providers because the number of supported locales is normally small and known ahead of time, unlike tenants, whose cardinality can be arbitrarily large.

```ts
@Injectable({ scope: Scope.REQUEST, durable: true })
export class TranslationService {
  constructor(@Inject(REQUEST) private readonly payload: { localeCode: string }) {}

  public static readonly defaultLanguage = 'en';
  public static readonly supportedLanguages = ['en', 'es'] as const;

  private readonly locales: Record<string, TranslationSchema> = { en, es };

  translate(key: TranslationKey, ...args: Array<string | Record<string, unknown>>): string {
    const locale = this.locales[this.payload.localeCode ?? TranslationService.defaultLanguage];
    const text = key.split('.').reduce((current, segment) => current[segment], locale);
    return format(text, ...args);
  }
}
```

Translation resources, one JSON file per locale:

```json
// en.json
{ "ERRORS": { "USER_NOT_FOUND": "User {name} does not exist" } }
```

```json
// es.json
{ "ERRORS": { "USER_NOT_FOUND": "El usuario {name} no existe" } }
```

Interpolating `{ name: 'Alex' }` into `ERRORS.USER_NOT_FOUND` produces `"User Alex does not exist"` (or the Spanish equivalent).

### Strongly typed translation keys

Deriving a union of valid dotted keys (`'ERRORS.USER_NOT_FOUND'`, etc.) from the shape of the translation JSON, rather than accepting any string, catches a typo'd translation key at compile time instead of at runtime. The mechanism is a couple of recursive mapped/conditional types that walk the JSON schema's shape and join nested keys with `.`; the exact implementation is less important than the result: `translate('ERRORS.MISSING_KEY')` fails to compile if that key doesn't exist in the schema.

Keeping the supported-language list as a `const` tuple and deriving a union type from it (`type SupportedLanguage = typeof TranslationService.supportedLanguages[number]`) keeps the runtime list and the type system in sync, instead of typing the locale map as `Record<string, ...>`, which would silently accept any string as a valid locale.

### Locale aggregation strategy

Structurally identical to the tenant strategy, but keyed by the client's negotiated language instead of a header value:

```ts
export class AggregateByLocaleContextIdStrategy implements ContextIdStrategy {
  private readonly locales = new Map<string, ContextId>();

  attach(contextId: ContextId, request: Request): ContextIdResolverFn | ContextIdResolver {
    const localeCode =
      pick(TranslationService.supportedLanguages, request.headers['accept-language']) ??
      TranslationService.defaultLanguage;

    let localeSubTreeId: ContextId;

    if (this.locales.has(localeCode)) {
      localeSubTreeId = this.locales.get(localeCode)!;
    } else {
      localeSubTreeId = ContextIdFactory.create();
      this.locales.set(localeCode, localeSubTreeId);
    }

    return {
      payload: { localeCode },
      resolve: (info: HostComponentInfo) => (info.isTreeDurable ? localeSubTreeId : contextId),
    };
  }
}
```

A library like `accept-language-parser` picks the best supported language from a real `Accept-Language` header (e.g. `es-CL,es;q=0.9,en;q=0.8`) against the application's supported list, falling back to the default language when nothing matches.

Apply this strategy the same way, once, before the application starts accepting requests.

### Language vs. locale

A production i18n system should distinguish *language* (`es`) from *locale* (`es-CL`, `es-MX`, `en-US`, `en-GB`): locale, not just language, affects translation choice, number formatting, dates, currency, pluralization, and other regional conventions. A worked example keyed only by language is a simplification worth outgrowing in a real system.

### Limits worth knowing about

A basic placeholder-interpolation library handles simple substitution but not a complete i18n feature set. A production system typically also needs plural rules, gender/select forms (ICU MessageFormat-style), number/date/currency formatting, time zones, fallback locale chains, missing-key reporting, and some form of translation schema validation.

## Durable provider is not a response cache

The thing being reused across requests is a contextual provider instance (part of the DI graph), not an HTTP response. The useful mental model is "singleton-like within one aggregated context," not "one global singleton for the whole application."
