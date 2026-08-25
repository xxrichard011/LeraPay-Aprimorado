import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IsEmail } from 'class-validator';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutLinkDto } from './dto/create-checkout-link.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { PayWithCardDto } from './dto/pay-with-card.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

class SendLinkByEmailDto {
  @IsEmail()
  to: string;
}

@ApiTags('checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('links')
  @ApiOperation({
    summary:
      'Cria um link de checkout. Para Pix, já gera o QR/EMV no gateway; para cartão, aguarda POST /checkout/links/:id/pay-card',
  })
  createLink(@CurrentUserId() userId: string, @Body() dto: CreateCheckoutLinkDto) {
    return this.checkoutService.createLink(userId, dto);
  }

  @Get('links')
  @ApiOperation({ summary: 'Lista os links de checkout do user (paginado)' })
  listLinks(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.checkoutService.listLinks(userId, query);
  }

  @Get('links/:id')
  @ApiOperation({ summary: 'Consulta um link de checkout e o pedido associado' })
  getLink(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.checkoutService.getLink(userId, id);
  }

  @Post('links/:id/pay-card')
  @ApiOperation({
    summary:
      'Envia os dados do cartão para um link de checkout do método cartão, validando installments/feePercent contra /api/fees',
  })
  payWithCard(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: PayWithCardDto,
  ) {
    return this.checkoutService.payWithCard(userId, id, dto);
  }

  @Post('links/:id/cancel')
  @ApiOperation({
    summary:
      'Cancela um link de checkout ainda aberto (aguardando pagamento). Não afeta pedidos com resultado definitivo (APPROVED/DENIED).',
  })
  cancelLink(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.checkoutService.cancelLink(userId, id);
  }

  @Get('orders')
  @ApiOperation({
    summary:
      'Lista pedidos locais com filtros (status: Sucesso/Falha/Expirado/Cancelado -> APPROVED/DENIED/EXPIRED/CANCELLED)',
  })
  listOrders(@CurrentUserId() userId: string, @Query() query: ListOrdersQueryDto) {
    return this.checkoutService.listOrders(userId, query);
  }

  @Post('links/:id/send-email')
  @ApiOperation({ summary: 'Diferencial: envia o link/QR de pagamento por e-mail ao pagador' })
  sendByEmail(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: SendLinkByEmailDto,
  ) {
    return this.checkoutService.sendLinkByEmail(userId, id, dto.to);
  }

  @Get('orders/:id/receipt')
  @ApiOperation({ summary: 'Diferencial: comprovante de pagamento em PDF (apenas pedidos aprovados)' })
  async getReceipt(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.checkoutService.generateReceipt(userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprovante-${id}.pdf"`);
    res.send(pdf);
  }
}
