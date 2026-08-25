# Session-based authentication (Passport + Redis)

Server-held authentication state instead of a client-held token: the browser holds a session cookie, and the server (backed by Redis) resolves it to a user on every request. Fits traditional server-rendered web apps and cases where instant, server-side revocation matters more than statelessness.

## Dependencies

```bash
npm i passport @nestjs/passport express-session connect-redis ioredis
npm i -D @types/passport @types/express-session
```

`connect-redis`'s API differs across versions; adapt the store setup to the installed version.

## Configuration

```dotenv
SESSION_SECRET=CHANGE_ME
REDIS_HOST=localhost
REDIS_PORT=6379
```

Conceptual session middleware setup:

```ts
session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true, // requires HTTPS in production
  },
});

passport.initialize();
passport.session();
```

## Sign-in service

```ts
@Injectable()
export class SessionAuthenticationService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly hashingService: HashingService,
  ) {}

  async signIn(dto: SignInDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (!user?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.hashingService.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
```

## Passport serializer

```ts
export class UserSerializer extends PassportSerializer {
  serializeUser(user: User, done: (err: Error | null, user: AuthenticatedUser) => void) {
    done(null, {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });
  }

  deserializeUser(payload: AuthenticatedUser, done: (err: Error | null, user: AuthenticatedUser) => void) {
    done(null, payload);
  }
}
```

Serializing full role/permission data avoids a database lookup on every request, but those values can go stale for the life of the session. If permission changes need to take effect immediately, serialize only `{ sub: user.id }` and re-fetch the user during `deserializeUser` instead.

## Session guard

```ts
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.isAuthenticated();
  }
}
```

## Controller

```ts
@Auth(AuthMethod.None)
@Controller('session-authentication')
export class SessionAuthenticationController {
  constructor(private readonly sessionAuthService: SessionAuthenticationService) {}

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(@Req() request: Request, @Body() dto: SignInDto) {
    const user = await this.sessionAuthService.signIn(dto);

    await new Promise<void>((resolve, reject) => {
      request.logIn(user, (error) => {
        if (error) { reject(error); return; }
        resolve();
      });
    });
  }

  @UseGuards(SessionGuard)
  @Get()
  sayHello(@ActiveUser() user: AuthenticatedUser) {
    return `Hello, ${user.email}!`;
  }
}
```

`@Auth(AuthMethod.None)` and `@ActiveUser()` come from the JWT auth setup in `jwt-authentication.md`: this pattern reuses the same decorator and metadata plumbing, swapping the guard implementation.

## Session vs JWT

Use session auth when instant, server-side logout matters more than avoiding a shared datastore, and when clients are cookie-capable browsers rather than mobile apps or other services. See the comparison table at the end of `jwt-authentication.md`.
