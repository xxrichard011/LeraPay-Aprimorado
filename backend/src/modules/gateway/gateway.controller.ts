import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { LoginGatewayAccountDto } from './dto/login-gateway-account.dto';
import { RegisterGatewayAccountDto } from './dto/register-gateway-account.dto';
import { GatewayAuthService } from './gateway-auth.service';
import { GatewayHttpService } from './gateway-http.service';

@ApiTags('gateway (conta Lera Box)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayAuthService: GatewayAuthService,
    private readonly gatewayHttp: GatewayHttpService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Cadastra o user logado no gateway Lera Box (POST /api/users do gateway)',
  })
  register(@CurrentUserId() userId: string, @Body() dto: RegisterGatewayAccountDto) {
    return this.gatewayAuthService.registerOnGateway(userId, dto);
  }

  @Post('login')
  @ApiOperation({
    summary:
      'Login na conta do gateway usando documento e senha recebidos por e-mail; token fica cifrado no backend',
  })
  login(@CurrentUserId() userId: string, @Body() dto: LoginGatewayAccountDto) {
    return this.gatewayAuthService.loginOnGateway(userId, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Status da integração do user com o gateway' })
  status(@CurrentUserId() userId: string) {
    return this.gatewayAuthService.getStatus(userId);
  }

  @Get('fees')
  @ApiOperation({ summary: 'Consulta as taxas de cartão vigentes no gateway (GET /api/fees)' })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Bandeira do cartão (ex.: VISA, MASTERCARD, ELO). Sem isso, o gateway retorna a tabela padrão.',
  })
  fees(@Query('brand') brand?: string) {
    return this.gatewayHttp.getFees(brand);
  }
}
