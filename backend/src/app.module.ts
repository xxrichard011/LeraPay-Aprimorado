import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import configuration from './config/configuration';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { EncryptionModule } from './common/crypto/encryption.module';
import { EmailModule } from './common/email/email.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { GatewayModule } from './modules/gateway/gateway.module';
import { UsersModule } from './modules/users/users.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [join(__dirname, '..', '.env'), join(__dirname, '..', '..', '.env')],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    EncryptionModule,
    EmailModule,
    UsersModule,
    GatewayModule,
    TransactionsModule,
    CheckoutModule,
    WalletModule,
    WithdrawalsModule,
    WebhooksModule,
  ],
})
export class AppModule implements NestModule {
  // Aplica o middleware de correlationId em todas as rotas, da pra rastrear cada request nos logs
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
