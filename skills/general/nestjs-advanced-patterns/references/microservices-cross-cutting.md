# Filters, pipes, guards, and interceptors on a microservice

The same recurring rule from `references/websockets.md` applies here too: filters, pipes, and guards need a transport-appropriate exception type instead of `HttpException`, this time `RpcException` from `@nestjs/microservices`. Interceptors need no change at all. `@UseFilters()`, `@UsePipes()`, `@UseGuards()`, and `@UseInterceptors()` all work at both the method level (a single `@MessagePattern()`/`@EventPattern()` handler) and the controller level.

## Exception filters

```ts
throw new RpcException('Invalid order state.');
```

produces a structured error response:

```json
{ "status": "error", "message": "Invalid order state." }
```

Unlike an HTTP filter's `catch()`, a microservice filter's `catch()` must return an Observable:

```ts
@Catch(RpcException)
export class OrdersExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(() => exception.getError());
  }
}
```

```ts
@UseFilters(new OrdersExceptionFilter())
@MessagePattern({ cmd: 'get_order_total' })
getOrderTotal(data: number[]): number {
  return (data || []).reduce((a, b) => a + b, 0);
}
```

Extend `BaseRpcExceptionFilter` to add custom handling (logging, metrics) while delegating to the framework's default behavior, the same pattern as `BaseWsExceptionFilter` in the WebSocket reference.

Global filters apply with the usual caveat for hybrid applications (an app serving both HTTP and a microservice transport): global registration doesn't automatically cover both transports the same way, so filters intended for the microservice side generally need explicit registration there.

## Pipes

Functionally identical to HTTP pipes; only the thrown exception type changes. A validation pipe needs its `exceptionFactory` overridden to throw the right type:

```ts
@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new RpcException(errors) }))
@MessagePattern({ cmd: 'get_order_total' })
getOrderTotal(data: number[]): number {
  return (data || []).reduce((a, b) => a + b, 0);
}
```

## Guards

Also functionally identical to HTTP guards beyond the exception type:

```ts
@UseGuards(OrdersAuthGuard)
@MessagePattern({ cmd: 'get_order_total' })
getOrderTotal(data: number[]): number {
  return (data || []).reduce((a, b) => a + b, 0);
}
```

## Interceptors

No difference from HTTP interceptors at all; the same class works unmodified on a message handler:

```ts
@UseInterceptors(new TransformInterceptor())
@MessagePattern({ cmd: 'get_order_total' })
getOrderTotal(data: number[]): number {
  return (data || []).reduce((a, b) => a + b, 0);
}
```
