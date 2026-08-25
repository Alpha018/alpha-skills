# Configurable dynamic modules

`ConfigurableModuleBuilder` removes most of the boilerplate needed to build a module that exposes configuration APIs like `register()`, `registerAsync()`, `forRoot()`, `forRootAsync()`.

## Module definition

```ts
export interface HttpClientModuleOptions {
  baseUrl?: string;
}

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: HTTP_MODULE_OPTIONS,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<HttpClientModuleOptions>({ alwaysTransient: true })
  .setExtras<{ isGlobal?: boolean }>({ isGlobal: true }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();
```

## What gets generated

- **`ConfigurableModuleClass`**: a base class providing the generated `register()`/`registerAsync()` methods:
  ```ts
  export class HttpClientModule extends ConfigurableModuleClass {}
  ```
- **`MODULE_OPTIONS_TOKEN`**: the token representing the configured options, for injection:
  ```ts
  @Inject(HTTP_MODULE_OPTIONS) private readonly options: HttpClientModuleOptions
  ```
- **`OPTIONS_TYPE`** / **`ASYNC_OPTIONS_TYPE`**: the types for `register(...)` and `registerAsync(...)` respectively.

## `alwaysTransient`

```ts
{ alwaysTransient: true }
```

Gives each registration of the module (`HttpClientModule.register({ baseUrl: 'A' })`, `HttpClientModule.register({ baseUrl: 'B' })`) an independent module identity. Only enable this with a clear reason: most modules should be configured once, not registered multiple times with different options in the same application.

## Extras vs. functional options

```ts
.setExtras<{ isGlobal?: boolean }>(
  { isGlobal: true },
  (definition, extras) => ({ ...definition, global: extras.isGlobal }),
)
```

The distinction: `baseUrl` is something a provider actually needs at runtime; `isGlobal` only affects the module *definition* itself (whether it's registered globally) and application services normally never need to read it directly.

## Renaming the generated methods

```ts
.setClassMethodName('forRoot')
```

turns `register()`/`registerAsync()` into `forRoot()`/`forRootAsync()`.

```ts
.setFactoryMethodName('resolve')
```

changes the factory method name expected from class-based async configuration.

Naming conventions (not hard framework rules): `register` when multiple consumers might independently configure the module; `forRoot` for root/global configuration; `forFeature` when a module reuses root configuration but registers local, feature-specific resources.

## Module class

```ts
@Module({})
export class HttpClientModule extends ConfigurableModuleClass {
  constructor(@Inject(HTTP_MODULE_OPTIONS) private readonly options: HttpClientModuleOptions) {
    super();
    // safe to use `this` only after super() has run
  }

  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      ...super.register(options),
      // additional custom logic
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    return {
      ...super.registerAsync(options),
      // additional custom logic
    };
  }
}
```

In a derived class, `super()` must run before `this` is accessed, same as any other JavaScript/TypeScript subclass.

## Usage

Synchronous:

```ts
HttpClientModule.register({ baseUrl: 'https://api.example.com' })
```

Asynchronous, supporting `useFactory`, `useClass`, `useExisting`, `inject`, and `imports`:

```ts
HttpClientModule.registerAsync({
  useFactory: () => ({ baseUrl: process.env.API_BASE_URL }),
})
```

Async configuration is what lets module options depend on `ConfigService`, secrets, other providers, remote configuration, or any computed value, instead of only a static object.
