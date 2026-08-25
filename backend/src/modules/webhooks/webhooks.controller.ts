import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { GatewayAuthService } from '../gateway/gateway-auth.service';
import { GatewayHttpService } from '../gateway/gateway-http.service';
import * as GatewayTypes from '../gateway/gateway.types';
import { CurrentUserId } from '../users/current-user.decorator';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { WebhookRequest, WebhookSignatureGuard } from './webhook-signature.guard';
import { LeraBoxWebhookPayload } from './webhook-payload.type';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly gatewayAuth: GatewayAuthService,
    private readonly gatewayHttp: GatewayHttpService,
    private readonly config: ConfigService,
  ) {}

  // Endpoint que o gateway Lera Box chama, não usa o JwtAuthGuard do user
  @Post('lera-box')
  @ApiExcludeEndpoint() // Endpoint tecnico, não expoe no Swagger de uso do usuario
  @UseGuards(WebhookSignatureGuard)
  async receive(@Req() req: WebhookRequest, @Body() payload: LeraBoxWebhookPayload) {
    const rawBody = (req as any).rawBody
      ? ((req as any).rawBody as Buffer).toString('utf8')
      : JSON.stringify(payload);
    return this.webhooksService.handle(payload, Boolean(req.webhookSignatureValid), rawBody);
  }

  // monta a url que a gente espera que o gateway chame (PUBLIC_BASE_URL)
  private buildExpectedUrl(): string {
    const publicBaseUrl = this.config.get<string>('publicBaseUrl');
    return `${publicBaseUrl}/webhooks/lera-box`;
  }

  @Post('register')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Cadastra no gateway (POST /api/webhooks) a URL deste BaaS para PAYMENT_PIX, PAYMENT_CARD e WITHDRAWAL',
  })
  async registerWebhook(@CurrentUserId() userId: string, @Req() req: Request) {
    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
    const url = this.buildExpectedUrl();

    const eventsToRegister: Array<'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL'> = [
      'PAYMENT_PIX',
      'PAYMENT_CARD',
      'WITHDRAWAL',
    ];

    // o gateway cadastra um webhook por evento (o campo 'event' chama uma vez pra cada tipo)
    const responses: GatewayTypes.GatewayWebhookResponse[] = [];
    for (const event of eventsToRegister) {
      const response = await this.gatewayHttp.registerWebhook(accessToken, { url, event });
      responses.push(response);
    }

    const secret = responses.find((r) => r.secret)?.secret;

    return {
      registered: true,
      url,
      events: responses.map((r) => r.event).filter(Boolean),
      secret,
      note: secret
        ? 'Copie este secret para LERA_BOX_WEBHOOK_SECRET no .env do backend e reinicie a aplicação.'
        : undefined,
    };
  }

  // Consulta o que ja ta cadastrado no gateway pra essa conta, sem criarnada novo
  @Get('register')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Consulta no gateway (GET /api/webhooks) o que já está cadastrado para esta conta',
  })
  async listRegisteredWebhooks(@CurrentUserId() userId: string) {
    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
    const url = this.buildExpectedUrl();

    const registered = await this.gatewayHttp.listWebhooks(accessToken);
    const matching = registered.filter((r) => r.url === url);

    if (matching.length === 0) {
      return { registered: false, url, events: [] as string[] };
    }

    return {
      registered: true,
      url,
      events: matching.map((r) => r.event).filter(Boolean),
    };
  }
}