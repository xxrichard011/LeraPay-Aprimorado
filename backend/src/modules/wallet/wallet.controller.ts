import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { WalletStatementQueryDto } from './dto/wallet-statement-query.dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Saldo do usuario no gateway (GET /api/wallet)' })
  getBalance(@CurrentUserId() userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Get('statement')
  @ApiOperation({
    summary:
      'Extrato consolidado (GET /api/wallet/transactions), abastecido com o pedido local quando houver conciliação por externalReference',
  })
  getStatement(@CurrentUserId() userId: string, @Query() query: WalletStatementQueryDto) {
    return this.walletService.getStatement(userId, query);
  }
}
