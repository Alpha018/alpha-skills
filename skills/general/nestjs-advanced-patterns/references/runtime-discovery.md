# Runtime container introspection

`DiscoveryService`, `Reflector`, and `MetadataScanner` together let application code inspect the IoC container itself at runtime: find every registered provider, read the metadata attached by custom decorators, and enumerate a class's methods. This is the foundation for building decorator-driven framework features: plugin systems, message-handler discovery, automatic registries, custom event systems, schedulers, validators, command buses.

## Class-level and method-level decorators

```ts
export const INTERVAL_HOST_KEY = 'INTERVAL_HOST_KEY';
export const IntervalHost: ClassDecorator = SetMetadata(INTERVAL_HOST_KEY, true);
```

```ts
export const INTERVAL_KEY = 'INTERVAL_KEY';
export const Interval = (ms: number) => SetMetadata(INTERVAL_KEY, ms);
```

Usage:

```ts
@IntervalHost
@Injectable()
export class ScheduledTasksService {
  @Interval(1000)
  everySecond() {
    // runs on the configured interval
  }
}
```

The class is now tagged with `INTERVAL_HOST_KEY = true`, and the method is tagged with `INTERVAL_KEY = 1000`.

## Building the scheduler

```ts
@Injectable()
export class IntervalScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper) => {
      const { instance } = wrapper;
      const prototype = instance && Object.getPrototypeOf(instance);

      if (!instance || !prototype) {
        return;
      }

      const isIntervalHost = this.reflector.get<boolean>(INTERVAL_HOST_KEY, instance.constructor) ?? false;
      if (!isIntervalHost) {
        return;
      }

      const methodKeys = this.metadataScanner.getAllMethodNames(prototype);

      methodKeys.forEach((methodKey) => {
        const interval = this.reflector.get<number>(INTERVAL_KEY, instance[methodKey]);
        if (interval === undefined) {
          return;
        }

        const intervalRef = setInterval(() => instance[methodKey](), interval);
        this.intervals.push(intervalRef);
      });
    });
  }

  onApplicationShutdown() {
    this.intervals.forEach((interval) => clearInterval(interval));
  }
}
```

`NodeJS.Timeout` (or `ReturnType<typeof setInterval>`) is the current, correct typing; older `NodeJS.Timer` typings should be avoided.

## What's happening

```text
Application bootstrap
       ↓
DiscoveryService.getProviders()
       ↓
provider wrappers → instance → prototype
       ↓
Reflector: is this class an interval host?
       ↓ yes
MetadataScanner: enumerate its methods
       ↓
Reflector: does this method have an @Interval(ms)?
       ↓ yes
setInterval(...)
```

## Registering `DiscoveryModule`

Importing `DiscoveryModule` explicitly is the safe approach for making `DiscoveryService` available:

```ts
@Module({
  imports: [DiscoveryModule],
  providers: [IntervalScheduler],
})
export class SchedulerModule {}
```

## Considerations

- Prefer `Symbol` metadata keys over global string keys when collision avoidance across unrelated decorators matters.
- The discovered callbacks invoke the actual Nest-managed instance, preserving its object context (`this` still works correctly inside the discovered method).
- Request-scoped or transient providers need extra care with this pattern: discovery naturally aligns with singleton providers, since it runs once at bootstrap against the current instance graph.
- This whole mechanism is metaprogramming: decorators attach metadata, and a separate runtime component reads and acts on that metadata. It's powerful, but it also means the actual behavior isn't visible just by reading the decorated class; the reader has to know the discovery mechanism exists.
