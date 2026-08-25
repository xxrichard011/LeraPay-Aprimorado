import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { GatewayAccount } from './gateway-account.entity';
import { GatewayAuthService } from './gateway-auth.service';
import { GatewayController } from './gateway.controller';
import { GatewayHttpService } from './gateway-http.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GatewayAccount]),
    HttpModule.register({ timeout: 15000, maxRedirects: 3 }),
    UsersModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayHttpService, GatewayAuthService],
  exports: [GatewayHttpService, GatewayAuthService],
})
export class GatewayModule {}
