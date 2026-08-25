@Injectable()
export class PaymentGatewayClient {
  constructor(private readonly httpService: HttpService) {}

  async charge(orderId: string, amountCents: number) {
    return this.httpService.axiosRef.post('https://payments.example.com/charge', {
      orderId,
      amountCents,
    });
  }
}
