import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';


// Envio do link/QR de pagamento por email (VIA SMTP)
interface SendPaymentEmailParams {
  to: string;
  amountFormatted: string;
  description?: string;
  method: 'PIX' | 'CARD';
  pixEmv?: string;
  pixQrCodeBase64?: string;
  checkoutUrl: string;
}

// Remove 'data:image/...base64', deixa só o base64 puro
function stripDataUriPrefix(base64OrDataUri: string): string {
  const match = base64OrDataUri.match(/^data:[^;]+;base64,(.*)$/s);
  return match ? match[1] : base64OrDataUri;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    if (host) {
      const port = this.config.get<number>('smtp.port') ?? 587;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        // Porta 465 = TLS
        // Porta 587 ou outras = STARTTLS
        secure: port === 465,
        auth: {
          user: this.config.get<string>('smtp.user'),
          pass: this.config.get<string>('smtp.password'),
        },
      });
    }
  }

  /* manda o email com o link/QR de pagamento
     se não tiver SMTP configurado, só loga e segue */
  async sendPaymentLink(params: SendPaymentEmailParams): Promise<{ sent: boolean }> {
    const from = this.config.get<string>('smtp.from');
    const subject = `Link de pagamento — ${params.amountFormatted}`;
    const html = this.buildHtml(params);

    if (!this.transporter) {
      this.logger.warn(
        `SMTP não configurado; e-mail para ${params.to} não enviado (apenas logado). Assunto: ${subject}`,
      );
      return { sent: false };
    }

    await this.sendMail(from, params, html);

    return { sent: true };
  }

  /* Isola o envio para transformar os erros mais comuns do SMTP
      (credencial errada, host/porta inacessível) */
  private async sendMail(
    from: string | undefined,
    params: SendPaymentEmailParams,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter!.sendMail({
        from,
        to: params.to,
        subject: `Link de pagamento — ${params.amountFormatted}`,
        html,
        attachments: params.pixQrCodeBase64
          ? [
              {
                filename: 'qrcode-pix.png',
                content: stripDataUriPrefix(params.pixQrCodeBase64),
                encoding: 'base64',
                cid: 'pixqrcode',
              },
            ]
          : undefined,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao enviar e-mail para ${params.to}: ${err?.message ?? err}`);

      // 535 é o código SMTP padrão para autenticação recusada (usuário ou senha incorretos)
      if (err?.responseCode === 535 || /invalid login|authentication/i.test(err?.message ?? '')) {
        throw new BadGatewayException(
          'Não foi possível enviar o e-mail: as credenciais SMTP (SMTP_USER/SMTP_PASSWORD) foram recusadas pelo servidor. Se estiver usando Gmail, confirme que está usando uma senha de app, não a senha normal da conta.',
        );
      }
      if (['ECONNECTION', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(err?.code)) {
        throw new BadGatewayException(
          'Não foi possível conectar ao servidor SMTP configurado. Confira SMTP_HOST e SMTP_PORT no .env do backend.',
        );
      }
      throw new BadGatewayException(
        'Não foi possível enviar o e-mail no momento. Verifique a configuração SMTP no .env do backend.',
      );
    }
  }

  // monta o corpo do email, muda o layout dependendo se é Pix (com QRCODE) ou link normal
  private buildHtml(params: SendPaymentEmailParams): string {
    const description = params.description ? `<p>${params.description}</p>` : '';
    if (params.method === 'PIX' && params.pixQrCodeBase64) {
      return `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2>Pagamento via Pix</h2>
          <p><strong>Valor:</strong> ${params.amountFormatted}</p>
          ${description}
          <img src="cid:pixqrcode" alt="QR Code Pix" width="220" height="220" />
          ${params.pixEmv ? `<p style="word-break: break-all; font-family: monospace; font-size: 12px;">${params.pixEmv}</p>` : ''}
        </div>
      `;
    }
    return `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Link de pagamento</h2>
        <p><strong>Valor:</strong> ${params.amountFormatted}</p>
        ${description}
        <p><a href="${params.checkoutUrl}">Acessar o link de pagamento</a></p>
      </div>
    `;
  }
}
