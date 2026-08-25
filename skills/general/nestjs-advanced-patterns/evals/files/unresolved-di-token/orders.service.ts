export interface OrdersDataSource {
  [index: number]: Order;
}

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: OrdersDataSource) {}
}
