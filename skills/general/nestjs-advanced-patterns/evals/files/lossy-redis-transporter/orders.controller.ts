const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  transport: Transport.REDIS,
  options: { host: 'localhost', port: 6379 },
});

@Controller()
export class OrdersController {
  @EventPattern('order_created')
  async handleOrderCreated(data: Record<string, unknown>) {
    // charges the payment, decrements inventory
  }
}
