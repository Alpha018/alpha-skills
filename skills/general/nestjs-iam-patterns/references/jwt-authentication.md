# JWT authentication (access + refresh tokens)

Stateless authentication using a short-lived access token and a longer-lived refresh token. The access token carries the user's identity (and optionally role/permissions) as signed claims; the refresh token is used to obtain a new pair without re-entering credentials, and is tracked server-side to allow revocation.

## Dependencies

```bash
npm i @nestjs/jwt @nestjs/config class-validator class-transformer
npm i ioredis   # only needed for refresh-token storage/rotation
```

## Configuration

`.env`:

```dotenv
JWT_SECRET=CHANGE_ME
JWT_TOKEN_AUDIENCE=localhost:3000
JWT_TOKEN_ISSUER=localhost:3000

# Numeric values are interpreted as seconds, not milliseconds.
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400
```

`jwt.config.ts`:

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  audience: process.env.JWT_TOKEN_AUDIENCE,
  issuer: process.env.JWT_TOKEN_ISSUER,
  accessTokenTtl: Number.parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '3600', 10),
  refreshTokenTtl: Number.parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10),
}));
```

Registered in the module:

```ts
imports: [
  JwtModule.registerAsync(jwtConfig.asProvider()),
  ConfigModule.forFeature(jwtConfig),
]
```

## DTOs

```ts
export class SignUpDto {
  @IsEmail() email: string;
  @MinLength(10) password: string;
}

export class SignInDto {
  @IsEmail() email: string;
  @MinLength(10) password: string;
  @IsOptional() @IsNumberString() tfaCode?: string;
}

export class RefreshTokenDto {
  @IsNotEmpty() refreshToken: string;
}
```

Enable global validation in `main.ts`:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

## Active user claims

```ts
export interface AuthenticatedUser {
  sub: number;          // JWT subject: the user id
  email: string;
  role: Role;
  permissions: PermissionType[];
}
```

## Sign-up and credential validation

```ts
async signUp(dto: SignUpDto): Promise<void> {
  try {
    const user = this.usersRepository.create({
      email: dto.email,
      password: await this.hashingService.hash(dto.password),
    });
    await this.usersRepository.save(user);
  } catch (error) {
    if (error?.code === '23505') {
      throw new ConflictException('Email already exists');
    }
    throw error;
  }
}

async validateCredentials(dto: SignInDto): Promise<User> {
  const user = await this.usersRepository.findOneBy({ email: dto.email });

  if (!user?.password) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const validPassword = await this.hashingService.compare(dto.password, user.password);
  if (!validPassword) {
    throw new UnauthorizedException('Invalid credentials');
  }

  return user;
}
```

Respond with a generic `Invalid credentials` message so the endpoint doesn't reveal whether an email exists. Checking `user?.password` before comparing also matters once a user might exist without a local password (e.g. a Google-only account, see `supplementary-factors.md`).

## Token signing

```ts
private signToken<T extends object>(userId: number, expiresIn: number, payload?: T) {
  return this.jwtService.signAsync(
    { sub: userId, ...payload },
    {
      secret: this.jwtConfiguration.secret,
      audience: this.jwtConfiguration.audience,
      issuer: this.jwtConfiguration.issuer,
      expiresIn,
    },
  );
}

async generateTokens(user: User) {
  const refreshTokenId = randomUUID();

  const [accessToken, refreshToken] = await Promise.all([
    this.signToken<Partial<AuthenticatedUser>>(user.id, this.jwtConfiguration.accessTokenTtl, {
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    }),
    this.signToken(user.id, this.jwtConfiguration.refreshTokenTtl, { refreshTokenId }),
  ]);

  await this.refreshTokenStore.insert(user.id, refreshTokenId, this.jwtConfiguration.refreshTokenTtl);

  return { accessToken, refreshToken };
}
```

## Access token guard

```ts
export const REQUEST_USER_KEY = 'user';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      request[REQUEST_USER_KEY] = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

## Global auth method dispatch (public routes, JWT-or-API-key routes)

Instead of attaching and removing guards per controller, set a default auth method globally and mark exceptions:

```ts
export enum AuthMethod {
  Bearer = 'bearer',
  ApiKey = 'api-key',
  None = 'none',
}

export const AUTH_METHOD_KEY = 'authMethod';
export const Auth = (...authMethods: AuthMethod[]) => SetMetadata(AUTH_METHOD_KEY, authMethods);
```

```ts
@Injectable()
export class AuthenticationGuard implements CanActivate {
  private static readonly defaultAuthMethod = AuthMethod.Bearer;

  private readonly authMethodGuardMap: Record<AuthMethod, CanActivate | CanActivate[]>;

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {
    this.authMethodGuardMap = {
      [AuthMethod.Bearer]: this.accessTokenGuard,
      [AuthMethod.ApiKey]: this.apiKeyGuard,
      [AuthMethod.None]: { canActivate: () => true },
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authMethods =
      this.reflector.getAllAndOverride<AuthMethod[]>(AUTH_METHOD_KEY, [context.getHandler(), context.getClass()]) ?? [
        AuthenticationGuard.defaultAuthMethod,
      ];

    const guards = authMethods.map((type) => this.authMethodGuardMap[type]).flat();
    let lastError: unknown = new UnauthorizedException();

    for (const guard of guards) {
      try {
        if (await guard.canActivate(context)) {
          return true;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }
}
```

Registered globally: `{ provide: APP_GUARD, useClass: AuthenticationGuard }`. Usage: `@Auth(AuthMethod.None)` for a public route, `@Auth(AuthMethod.Bearer, AuthMethod.ApiKey)` for JWT **or** API key (OR semantics).

## `@ActiveUser()` decorator

```ts
export const ActiveUser = createParamDecorator((field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user: AuthenticatedUser | undefined = request[REQUEST_USER_KEY];
  return field ? user?.[field] : user;
});
```

```ts
@Get('me')
getMe(@ActiveUser() user: AuthenticatedUser) { return user; }

@Get('me/email')
getEmail(@ActiveUser('email') email: string) { return email; }
```

## Refresh token rotation with Redis

```ts
export class InvalidatedRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenStore implements OnApplicationBootstrap, OnApplicationShutdown {
  private redisClient: Redis;

  onApplicationBootstrap() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
  }

  onApplicationShutdown() {
    return this.redisClient.quit();
  }

  async insert(userId: number, tokenId: string, ttlSeconds: number): Promise<void> {
    await this.redisClient.set(this.getKey(userId), tokenId, 'EX', ttlSeconds);
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const storedId = await this.redisClient.get(this.getKey(userId));
    if (storedId !== tokenId) {
      throw new InvalidatedRefreshTokenError();
    }
    return true;
  }

  async invalidate(userId: number): Promise<void> {
    await this.redisClient.del(this.getKey(userId));
  }

  private getKey(userId: number): string {
    return `refresh-token:${userId}`;
  }
}
```

This keeps a single active refresh token per user: signing in on a second device invalidates the first. For concurrent sessions across devices, key by `refresh-token:{userId}:{sessionId}` instead and track sessions independently.

```ts
async refreshTokens(dto: RefreshTokenDto) {
  try {
    const payload = await this.jwtService.verifyAsync<Pick<AuthenticatedUser, 'sub'> & { refreshTokenId: string }>(
      dto.refreshToken,
      {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      },
    );

    const user = await this.usersRepository.findOneByOrFail({ id: payload.sub });
    await this.refreshTokenStore.validate(user.id, payload.refreshTokenId);

    // Rotation: the token just used becomes invalid.
    await this.refreshTokenStore.invalidate(user.id);

    return this.generateTokens(user);
  } catch (error) {
    if (error instanceof InvalidatedRefreshTokenError) {
      throw new UnauthorizedException('Refresh token has been invalidated');
    }
    throw new UnauthorizedException();
  }
}
```

Each successful refresh issues a new refresh token and invalidates the one just used, which limits the reuse window of a stolen refresh token.

## Controller

```ts
@Auth(AuthMethod.None)
@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('sign-up')
  signUp(@Body() dto: SignUpDto) { return this.authService.signUp(dto); }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  signIn(@Body() dto: SignInDto) { return this.authService.signIn(dto); }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-tokens')
  refreshTokens(@Body() dto: RefreshTokenDto) { return this.authService.refreshTokens(dto); }
}
```

## Cookie transport as an alternative to the Authorization header

```ts
response.cookie('accessToken', accessToken, { secure: true, httpOnly: true, sameSite: 'lax' });
```

The guard then reads `request.cookies.accessToken` instead of parsing the `Authorization` header. Using cookies for token transport requires CSRF protection, correct `SameSite`, and HTTPS.

## JWT vs session vs API key

| Aspect | JWT | Session | API key |
|---|---|---|---|
| Primary state | Client/token | Server | N/A (opaque credential) |
| Scalability | Convenient, stateless | Needs a shared store | Convenient |
| Revocation | Needs an extra mechanism | Natural | Independent rotation |
| Typical client | Mobile, SPA, server-to-server | Traditional web | Integrations, CLIs, webhooks |
