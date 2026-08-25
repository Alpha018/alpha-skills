# Authorization strategies: roles, permissions, policies

Authorization is a separate concern from authentication and runs after it: once a guard has established who the caller is (see the authentication reference files), a second guard decides whether they're allowed to perform the specific action. These three strategies commonly layer rather than compete; see the layering example at the end.

## RBAC: roles

Coarse-grained: a small, fixed set of user categories.

```ts
export enum Role {
  Regular = 'regular',
  Admin = 'admin',
}
```

```ts
// on User
@Column({ type: 'enum', enum: Role, default: Role.Regular })
role: Role;
```

```ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const user: AuthenticatedUser = context.switchToHttp().getRequest()[REQUEST_USER_KEY];
    return requiredRoles.some((role) => user.role === role);
  }
}
```

```ts
@Roles(Role.Admin)
@Post()
create(@Body() dto: CreateInvoiceDto) { return this.invoicesService.create(dto); }
```

`requiredRoles.some(...)` means the check passes if the user matches **any** of the listed roles.

## Permission-based authorization

More granular than roles: grants specific actions rather than a broad category.

```ts
export enum InvoicesPermission {
  CreateInvoice = 'create_invoice',
  UpdateInvoice = 'update_invoice',
  DeleteInvoice = 'delete_invoice',
}

export type PermissionType = InvoicesPermission; // union in a real app: InvoicesPermission | UsersPermission | ...
```

```ts
// on User
@Column({ type: 'json', default: [] })
permissions: PermissionType[];
```

PostgreSQL can also model this with `jsonb`, relational tables, or a normalized RBAC/ABAC schema depending on the domain.

```ts
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionType[]) => SetMetadata(PERMISSIONS_KEY, permissions);
```

```ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const user: AuthenticatedUser = context.switchToHttp().getRequest()[REQUEST_USER_KEY];
    return requiredPermissions.every((permission) => user.permissions?.includes(permission));
  }
}
```

```ts
@Permissions(Permission.CreateInvoice)
@Post()
create(@Body() dto: CreateInvoiceDto) { return this.invoicesService.create(dto); }
```

`requiredPermissions.every(...)` means **all** listed permissions are required, the opposite combination logic from roles. Mixing these two up (using `.some()` where the model calls for `.every()`, or vice versa) silently changes what the endpoint actually enforces.

## Policy-based authorization (ABAC)

For rules a static role or permission can't express: resource ownership, tenant membership, age, org affiliation, or any check that needs runtime context.

```ts
export interface Policy {
  name: string;
}

export interface PolicyHandler<T extends Policy> {
  handle(policy: T, user: AuthenticatedUser): Promise<void>;
}
```

Handlers register themselves against their policy class in a shared storage:

```ts
@Injectable()
export class PolicyHandlerRegistry {
  private readonly collection = new Map<Type<Policy>, PolicyHandler<any>>();

  add<T extends Policy>(policyClass: Type<T>, handler: PolicyHandler<T>) {
    this.collection.set(policyClass, handler);
  }

  get<T extends Policy>(policyClass: Type<T>): PolicyHandler<T> {
    const handler = this.collection.get(policyClass);
    if (!handler) {
      throw new Error(`"${policyClass.name}" does not have an associated handler`);
    }
    return handler;
  }
}
```

Example policy and handler: a contributor check against an organization's email domain.

```ts
export class OrgContributorPolicy implements Policy {
  name = 'OrgContributor';
}

@Injectable()
export class OrgContributorPolicyHandler implements PolicyHandler<OrgContributorPolicy> {
  constructor(private readonly storage: PolicyHandlerRegistry) {
    this.storage.add(OrgContributorPolicy, this);
  }

  async handle(policy: OrgContributorPolicy, user: AuthenticatedUser): Promise<void> {
    const isContributor = user.email.endsWith('@your-org.example');
    if (!isContributor) {
      throw new Error('User is not an org contributor');
    }
  }
}
```

Decorator and guard:

```ts
export const POLICIES_KEY = 'policies';
export const Policies = (...policies: Policy[]) => SetMetadata(POLICIES_KEY, policies);
```

```ts
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyHandlerRegistry: PolicyHandlerRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<Policy[]>(POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policies) {
      return true;
    }

    const user: AuthenticatedUser = context.switchToHttp().getRequest()[REQUEST_USER_KEY];

    try {
      await Promise.all(
        policies.map((policy) => {
          const handler = this.policyHandlerRegistry.get(policy.constructor as Type<Policy>);
          return handler.handle(policy, user);
        }),
      );
      return true;
    } catch (error) {
      throw new ForbiddenException(error instanceof Error ? error.message : 'Access denied');
    }
  }
}
```

```ts
@Policies(new OrgContributorPolicy())
@Post()
create(@Body() dto: CreateInvoiceDto) { return this.invoicesService.create(dto); }
```

Policies compose naturally: `@Policies(new MinAgePolicy(18), new OnlyAdminPolicy(), new ResourceOwnerPolicy())`.

## Comparing the three

| Strategy | Question | Example |
|---|---|---|
| Roles | What type of user is this? | `Admin` |
| Permissions | What can they do? | `create_invoice` |
| Policies | Does this contextual rule hold? | Is the resource owner |

## Layering

A common structure combines all three rather than picking one:

```text
Role
  │
  └── Permissions
          │
          └── Contextual policy

Example: Admin
            │
            └── users.delete
                     │
                     └── only within their own organization
```

Register only the guards the project actually needs (`RolesGuard`, `PermissionsGuard`, `PoliciesGuard`) as `APP_GUARD` providers, after the authentication guard runs.
