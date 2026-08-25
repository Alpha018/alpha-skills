# Explicit vs implicit DI tokens

Understanding what Nest can and can't infer at runtime is the foundation for most of the other patterns in this skill.

## Implicit injection

The usual pattern needs no `@Inject()`:

```ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
}
```

This works because TypeScript emits runtime design metadata for decorated classes. The compiled JavaScript includes something conceptually like:

```js
__metadata('design:paramtypes', [orders_service_1.OrdersService]);
```

Nest inspects that metadata and infers: constructor parameter 0 needs `OrdersService`, so the token is the `OrdersService` class itself, resolved from the IoC container.

## Explicit equivalent

The same dependency can be written with `@Inject()`:

```ts
@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}
}
```

The result is equivalent at runtime. When the token is the concrete class itself, `@Inject()` is usually redundant.

## Why interfaces break this

```ts
export interface OrdersDataSource {
  [index: number]: Order;
}

constructor(private readonly dataSource: OrdersDataSource) {}
```

TypeScript interfaces and type aliases are erased at compile time: no runtime JavaScript value exists for them. The compiled metadata for a parameter typed as an interface ends up as `Object`, not the interface name, which is one of the most common causes of "Nest can't resolve dependencies of ..." or an unresolved `Object` token in Nest's error output.

## The fix: a runtime token

Use a `Symbol` (or a string, or a concrete/abstract class) as the token, register it explicitly, and inject it explicitly:

```ts
export const ORDERS_DATA_SOURCE = Symbol('ORDERS_DATA_SOURCE');
```

```ts
@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_DATA_SOURCE, useValue: [] },
  ],
})
export class OrdersModule {}
```

```ts
@Injectable()
export class OrdersService {
  constructor(@Inject(ORDERS_DATA_SOURCE) private readonly dataSource: OrdersDataSource) {}
}
```

## Mental rule

Does the dependency exist as a JavaScript runtime value?

- **Yes** (a class, an abstract class, a `Symbol` constant, a string constant) → Nest can usually infer the token from the type.
- **No** (an `interface`, a `type` alias) → use `@Inject(TOKEN)` with an explicit runtime token.

## Token organization

Avoid coupling a shared token to whichever module file happens to define it first:

```text
orders/
├── orders.constants.ts   ← runtime tokens/constants live here
├── orders.module.ts
├── orders.service.ts
└── orders.controller.ts
```

A useful structural split, when a module grows past a couple of files:

```text
service.ts       → service implementation
module.ts        → module definition
controller.ts    → controller
constants.ts     → runtime tokens/constants
interfaces/*.ts  → compile-time contracts
decorators/*.ts  → decorators
```

This reduces coupling and helps prevent circular dependencies, since consumers can import a token from `constants.ts` without importing the whole module.

## Inspecting what actually got compiled

When a resolution error is confusing, check what TypeScript/Nest actually emitted:

```bash
npm run build
```

Then read the compiled output for the class in question under `dist/`. This shows directly which parameters kept a real type and which one collapsed to `Object`.

## Detecting circular dependencies

```bash
npx madge dist/main.js --circular
npx madge dist/main.js --image graph.png
```

Madge detects circular-dependency chains and can render the dependency graph as an image (the image output needs Graphviz installed separately).
