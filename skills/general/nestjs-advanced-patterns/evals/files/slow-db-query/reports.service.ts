@Injectable()
export class ReportsService {
  constructor(@InjectRepository(Order) private readonly ordersRepository: Repository<Order>) {}

  async monthlyTotals() {
    return this.ordersRepository.query('SELECT date_trunc(\'month\', created_at), sum(amount_cents) FROM orders GROUP BY 1');
  }
}
