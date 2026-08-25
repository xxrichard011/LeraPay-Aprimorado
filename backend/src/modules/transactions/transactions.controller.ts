import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Espelho local conciliado (Pix, cartão e saques). Não depende de chamada ao gateway; ' +
      'reflete o ultimo status confirmado por webhook/consulta ativa/criação local.',
  })
  list(@CurrentUserId() userId: string, @Query() query: ListTransactionsQueryDto) {
    return this.transactionsService.list(userId, query);
  }
}
