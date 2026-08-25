import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

export interface WebhookRequest extends Request {
  webhookSignatureValid?: boolean;
}

// Valida X-Lera-Box-Signature  quando LERA_BOX_WEBHOOK_SECRET tiver configurado 
// Sem secret configurado só loga um aviso e deixa passar .

// Nunca bloqueia totalmente o recebimento: mesmo com assinatura invalida o evento é salvo, só que marcado como não confiável e não é processado.

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<WebhookRequest>();
    const secret = this.config.get<string>('gateway.webhookSecret');

    if (!secret) {
      this.logger.warn(
        'LERA_BOX_WEBHOOK_SECRET não configurado; recebendo webhook sem validar assinatura (evento será processado mesmo assim).',
      );
      req.webhookSignatureValid = true; // sem secret configurado não tem o que validar mesmo, deixa passar
      return true;
    }

    const signatureHeader = req.header('x-lera-box-signature');
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!signatureHeader || !rawBody) {
      this.logger.warn('Webhook recebido sem assinatura ou sem corpo bruto disponível.');
      req.webhookSignatureValid = false;
      return true; // deixa entrar pra auditoria, mas fica marcado como não processado
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signatureHeader.replace(/^sha256=/, '');

    let valid = false;
    try {
      valid =
        expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
    } catch {
      valid = false;
    }

    req.webhookSignatureValid = valid;
    if (!valid) {
      this.logger.warn('Assinatura X-Lera-Box-Signature inválida.');
    }
    return true;
  }
}
