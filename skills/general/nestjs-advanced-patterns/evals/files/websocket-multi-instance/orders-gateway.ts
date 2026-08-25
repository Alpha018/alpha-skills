@WebSocketGateway({ namespace: 'orders' })
export class OrdersGateway {
  @SubscribeMessage('order-status')
  handleOrderStatus(@MessageBody() data: unknown) {
    return data;
  }
}
