@Injectable({ scope: Scope.REQUEST })
export class TenantDataSourceService {
  constructor(@Inject(REQUEST) private readonly request: unknown) {}

  // opens a tenant-specific database connection per request
}
