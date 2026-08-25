# Lazy-loading modules

Nest loads modules eagerly at bootstrap by default. `LazyModuleLoader` lets a selected module load only when it's actually needed, instead of paying its initialization cost for every application start.

## Generating a module that stays out of the eager graph

```bash
nest g mo reporting --skip-import
nest g s reporting
```

`--skip-import` stops the CLI from automatically importing `ReportingModule` into another module, which keeps it out of the initial eager module graph.

## Injecting `LazyModuleLoader`

```ts
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_DATA_SOURCE) private readonly dataSource: OrdersDataSource,
    private readonly lazyModuleLoader: LazyModuleLoader,
  ) {}
}
```

## Loading on demand

```ts
async create(createOrderDto: CreateOrderDto) {
  const reportingModuleRef = await this.lazyModuleLoader.load(() =>
    import('../reporting/reporting.module').then((m) => m.ReportingModule),
  );

  const { ReportingService } = await import('../reporting/reporting.service');
  const reportingService = reportingModuleRef.get(ReportingService);

  reportingService.recordOrderCreated();

  return 'order created';
}
```

Flow: the dynamic `import()` loads the module code, `LazyModuleLoader.load()` integrates it into Nest's module and DI system and returns a `ModuleRef`, and `moduleRef.get()` resolves a provider from it.

`import()` and `LazyModuleLoader` solve different problems: `import()` is plain JavaScript/TypeScript module loading; `LazyModuleLoader` is what makes a dynamically imported module a first-class part of Nest's module and DI graph, so its providers can actually be resolved.

## Measuring the cost

```ts
console.time('reporting-module');
const reportingModuleRef = await this.lazyModuleLoader.load(/* ... */);
console.timeEnd('reporting-module');
```

The first call pays the initialization cost; later calls reuse the already-loaded module.

## When it's actually worth it

A good candidate combines all of these:

- expensive to initialize;
- infrequently used;
- doesn't define infrastructure that needs to exist at bootstrap;
- fine to initialize on first use rather than eagerly.

Typical fits: report generation, optional third-party integrations, document-generation engines, administrative-only functions, specialized plugins, infrequently used processors, some serverless workloads.

Don't lazy-load modules everywhere. A frequently used module gains little from delayed loading and adds a layer of async indirection for no real benefit. Also don't lazy-load something that needs to register infrastructure (a global interceptor, a required provider for other eager modules) at application bootstrap: it needs to exist before the first request that could depend on it, not on first explicit use.
