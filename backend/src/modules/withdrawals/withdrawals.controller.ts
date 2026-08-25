import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Solicita um saque para chave Pix ou conta bancária (POST /api/withdrawals)' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os saques do usuario' })
  list(@CurrentUserId() userId: string) {
    return this.withdrawalsService.list(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta o status de um saque (GET /api/withdrawals/:id)' })
  getById(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.withdrawalsService.getById(userId, id);
  }
}
