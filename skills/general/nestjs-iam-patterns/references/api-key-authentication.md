# API key authentication

Credentials for non-interactive clients: server-to-server integrations, automation, CLIs, external services, and authenticated webhooks. Not a substitute for user login: it identifies an integration or service account, not a person authenticating interactively.

## Storage pattern

An API key should never sit in the database as plain, comparable text:

```text
Original API key
     │
     ├── handed to the client once, never stored in plain text again
     │
     └── hashed
          │
          ▼
      Database
```

## Entity

```ts
@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string; // hashed value

  @Column({ unique: true })
  uuid: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user: User;
}
```

```ts
// on User
@OneToMany(() => ApiKey, (apiKey) => apiKey.user)
apiKeys: ApiKey[];
```

`@JoinTable()` is for `ManyToMany` relations; it doesn't belong on this `OneToMany`/`ManyToOne` pair.

## Service

Encode the entity's `uuid` inside the API key itself so the key can be looked up without a table scan, and use one consistent identifier (`uuid`) throughout rather than mixing it with the numeric `id`:

```ts
export interface GeneratedApiKeyPayload {
  uuid: string;
  apiKey: string;
  hashedKey: string;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly hashingService: HashingService) {}

  async createAndHash(): Promise<GeneratedApiKeyPayload> {
    const uuid = randomUUID();
    const apiKey = this.generateApiKey(uuid);
    const hashedKey = await this.hashingService.hash(apiKey);
    return { uuid, apiKey, hashedKey };
  }

  validate(apiKey: string, hashedKey: string): Promise<boolean> {
    return this.hashingService.compare(apiKey, hashedKey);
  }

  extractUuidFromApiKey(apiKey: string): string {
    const [uuid] = Buffer.from(apiKey, 'base64').toString('utf8').split(' ');
    return uuid;
  }

  private generateApiKey(uuid: string): string {
    const raw = `${uuid} ${randomUUID()}`;
    return Buffer.from(raw).toString('base64');
  }
}
```

Base64 here is encoding, not encryption: it only packages `<uuid> <random secret>` into a single opaque string. Security comes from the random secret and from storing only its hash.

## Guard

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    @InjectRepository(ApiKey) private readonly apiKeysRepository: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractKeyFromHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException();
    }

    try {
      const uuid = this.apiKeysService.extractUuidFromApiKey(apiKey);

      const entity = await this.apiKeysRepository.findOne({
        where: { uuid },
        relations: { user: true },
      });

      if (!entity) {
        throw new UnauthorizedException();
      }

      const valid = await this.apiKeysService.validate(apiKey, entity.key);
      if (!valid) {
        throw new UnauthorizedException();
      }

      request[REQUEST_USER_KEY] = {
        sub: entity.user.id,
        email: entity.user.email,
        role: entity.user.role,
        permissions: entity.user.permissions,
      } satisfies AuthenticatedUser;

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractKeyFromHeader(request: Request): string | undefined {
    const [type, key] = request.headers.authorization?.split(' ') ?? [];
    return type === 'ApiKey' ? key : undefined;
  }
}
```

The `validate()` result must actually be checked: calling it without inspecting the returned boolean silently accepts any key that reaches this point.

## Creating a key

```ts
const generated = await apiKeysService.createAndHash();

await apiKeysRepository.save({
  uuid: generated.uuid,
  key: generated.hashedKey,
  user: { id: 1 },
});
```

Only `generated.apiKey` is returned to the client; it is never stored or logged in plain text again.

```http
Authorization: ApiKey <API_KEY>
```

## Scopes

A key doesn't have to inherit all of its owning user's permissions. Associating specific scopes with each key lets one integration hold `invoice:read` while another holds both `invoice:read` and `invoice:create`, independent of what the owning user can do.

## API key vs JWT

| API key | JWT |
|---|---|
| Identifies an integration/application | Identifies an authenticated user |
| Can be long-lived | Normally short-lived |
| Opaque secret | Signed payload with claims |
| Independent rotation | Access + refresh pair |
| Technical credential | User session |
