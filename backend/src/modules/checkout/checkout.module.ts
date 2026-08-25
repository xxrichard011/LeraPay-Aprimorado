import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptService } from '../../common/pdf/receipt.service';
import { GatewayModule } from '../gateway/gateway.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutLink } from './entities/checkout-link.entity';
import { Order } from './entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckoutLink, Order]),
    GatewayModule,
    UsersModule,
    TransactionsModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, ReceiptService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
