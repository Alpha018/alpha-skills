# Mixins and class factories

Two related but distinct composition patterns: mixins extend a given base class with reusable behavior, and class factories generate a new class parameterized by an argument. Both provide code reuse without a traditional inheritance hierarchy.

## Mixins

```ts
export function WithUuid<TBase extends Type>(Base: TBase) {
  return class extends Base {
    uuid = randomUUID();

    regenerateUuid() {
      this.uuid = randomUUID();
    }
  };
}
```

Usage:

```ts
export class Order {
  constructor(public reference: string) {}
}

const OrderWithUuid = WithUuid(Order);
const order = new OrderWithUuid('Order reference');
// order.reference, order.uuid, order.regenerateUuid() all exist
```

Composing several mixins:

```ts
const EnhancedOrder = Timestamped(Auditable(WithUuid(Order)));
```

Traditional inheritance gives a class exactly one parent; mixins let it compose N independent, orthogonal behaviors. Mixins work best for genuinely orthogonal reusable behavior (timestamps, UUIDs, auditing). They shouldn't automatically replace service composition or delegation, especially once the behavior has complex dependencies or meaningful domain state of its own.

## Class factories

A different pattern: a function that returns a new class, parameterized by an argument, rather than extending a base class.

```ts
export function EntityExistsPipe(entityCls: Type): Type<PipeTransform> {
  @Injectable()
  class EntityExistsPipeCls implements PipeTransform {
    constructor(
      @Inject(entityCls)
      private readonly entityRepository: { exists(condition: unknown): Promise<boolean> },
    ) {}

    async transform(value: string, metadata: ArgumentMetadata) {
      const exists = await this.entityRepository.exists({ where: { id: value } });

      if (!exists) {
        throw new NotFoundException();
      }

      return value;
    }
  }

  return EntityExistsPipeCls;
}
```

Usage:

```ts
@Patch(':id')
update(@Param('id', EntityExistsPipe(Order)) id: string, @Body() updateOrderDto: UpdateOrderDto) {
  return this.ordersService.update(+id, updateOrderDto);
}
```

## Naming the distinction

A classic mixin (`Mixin(Base)`) extends an existing class. `EntityExistsPipe(Entity)` instead creates a brand-new class parameterized by an input; it's more accurately called a dynamic class factory than a mixin, even though both achieve composition without a rigid inheritance chain. Nest also exposes a `mixin(...)` helper from `@nestjs/common`, aimed specifically at dynamically generated guards, interceptors, and pipes like this one.

## A real ORM caveat with this pattern

`@Inject(entityCls)` only works if `entityCls` is actually the DI token that represents the repository, not the entity class itself. With most ORMs, the entity class and its repository's DI token are different things (for example, TypeORM's repository token is derived from the entity via a helper like `getRepositoryToken(Entity)`, not the entity class directly). A real implementation needs to resolve the correct repository token rather than assuming the entity class doubles as one.

Also, an ORM's `exists()`-style check commonly returns a plain boolean rather than throwing when nothing matches. Don't assume it throws: check the returned value explicitly and throw `NotFoundException` from the pipe itself, as shown above.
