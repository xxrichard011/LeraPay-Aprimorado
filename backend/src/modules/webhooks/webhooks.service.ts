import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { mapGatewayStatusToOrderStatus } from '../../common/enums/order-status.enum';
import { CheckoutLinkStatus } from '../checkout/entities/checkout-link.entity';
import { CheckoutService } from '../checkout/checkout.service';
import { mapGatewayWithdrawalStatus } from '../withdrawals/withdrawals.service';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';
import { TransactionsService } from '../transactions/transactions.service';
import { WebhookEvent } from './entities/webhook-event.entity';
import { LeraBoxWebhookPayload } from './webhook-payload.type';

// Traduz o status do pedido pro status do link de checkout (link e order são coisas diferentes)
function linkStatusForOrderStatus(orderStatus: string): CheckoutLinkStatus | null {
  switch (orderStatus) {
    case 'APPROVED':
      return CheckoutLinkStatus.PAID;
    case 'DENIED':
      return CheckoutLinkStatus.DENIED;
    case 'EXPIRED':
      return CheckoutLinkStatus.EXPIRED;
    case 'CANCELLED':
      return CheckoutLinkStatus.CANCELLED;
    default:
      return null; // PENDING: link continua aberto
  }
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly eventsRepo: Repository<WebhookEvent>,
    private readonly checkoutService: CheckoutService,
    private readonly withdrawalsService: WithdrawalsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  // Ponto de entrada de todo webhook: salva o evento bruto e só processa se a assinatura for valida
  async handle(payload: LeraBoxWebhookPayload, signatureValid: boolean, rawBody: string) {
    const dedupeKey = payload?.id
      ? `${payload.event}:${payload.id}`
      : crypto.createHash('sha256').update(rawBody).digest('hex');

    // O gateway entrega webhooks "pelo menos uma vez": duas notificações do mesmo
    // pagamento podem chegar quase simultaneamente. Isso pode se manifestar como
    // ER_DUP_ENTRY (a outra já commitou) ou como deadlock por gap-lock do índice
    // único (nenhuma commitou ainda). Nos dois casos, o efeito é o mesmo: alguém
    // ganhou a corrida e já existe (ou vai existir) uma linha com esse dedupeKey.
    const event = await this.saveEventWithRetry(payload, signatureValid, rawBody, dedupeKey);
    if (event.alreadyExisted) {
      const existing = event.record;

      // Se a tentativa anterior falhou (ou ficou presa em RECEIVED por um crash
      // no meio do processamento), o gateway reenviando o mesmo webhook é a
      // nossa chance de reprocessar — não pode ser descartado como duplicado,
      // senão o Pix fica preso como "falhou" pra sempre.
      if (existing.status === 'FAILED' || existing.status === 'RECEIVED') {
        this.logger.log(
          `Webhook reenviado para evento pendente (dedupeKey=${dedupeKey}, status anterior=${existing.status}); reprocessando`,
        );
        return this.processAndFinalize(existing, payload, signatureValid);
      }

      this.logger.log(`Webhook duplicado ignorado (dedupeKey=${dedupeKey}, status=${existing.status})`);
      return { deduplicated: true, eventId: existing.id };
    }

    return this.processAndFinalize(event.record, payload, signatureValid);
  }

  // Cria a linha do evento; se colidir com outra requisição concorrente (duplicidade
  // real ou deadlock de gap-lock), busca e devolve o registro existente em vez de propagar o erro.
  private async saveEventWithRetry(
    payload: LeraBoxWebhookPayload,
    signatureValid: boolean,
    rawBody: string,
    dedupeKey: string,
    attempt = 0,
  ): Promise<{ alreadyExisted: false; record: WebhookEvent } | { alreadyExisted: true; record: WebhookEvent }> {
    const existing = await this.eventsRepo.findOne({ where: { dedupeKey } });
    if (existing) {
      return { alreadyExisted: true, record: existing };
    }

    const event = this.eventsRepo.create({
      eventType: payload?.event ?? 'UNKNOWN',
      dedupeKey,
      rawPayload: rawBody,
      signatureValid,
      status: 'RECEIVED',
    });

    try {
      await this.eventsRepo.save(event);
      return { alreadyExisted: false, record: event };
    } catch (err) {
      if (this.isDeadlockError(err) && attempt < 3) {
        // Deadlock: nenhuma das duas transações havia commitado ainda. Espera um
        // pouco (com jitter, pra não sincronizar um novo choque) e tenta de novo;
        // dessa vez ou o insert vai passar, ou vamos achar a linha que a outra
        // requisição conseguiu inserir.
        const backoffMs = 50 * (attempt + 1) + Math.floor(Math.random() * 50);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.saveEventWithRetry(payload, signatureValid, rawBody, dedupeKey, attempt + 1);
      }

      if (this.isDuplicateKeyError(err)) {
        const concurrent = await this.eventsRepo.findOne({ where: { dedupeKey } });
        if (concurrent) {
          return { alreadyExisted: true, record: concurrent };
        }
      }

      throw err;
    }
  }

  // Executa o processamento do pagamento/saque e persiste o resultado no evento.
  private async processAndFinalize(
    event: WebhookEvent,
    payload: LeraBoxWebhookPayload,
    signatureValid: boolean,
  ) {
    if (!signatureValid) {
      event.status = 'IGNORED';
      event.processingError = 'Assinatura inválida ou ausente; evento não processado.';
      event.processedAt = new Date();
      await this.eventsRepo.save(event);
      return { deduplicated: false, eventId: event.id, processed: false };
    }

    try {
      await this.process(payload);
      event.status = 'PROCESSED';
      event.processingError = null; // limpa o erro de uma tentativa anterior, se houver
      event.processedAt = new Date();
      await this.eventsRepo.save(event);
      return { deduplicated: false, eventId: event.id, processed: true };
    } catch (err) {
      event.status = 'FAILED';
      event.processingError = (err as Error)?.message ?? 'Erro desconhecido';
      event.processedAt = new Date();
      await this.eventsRepo.save(event);
      throw err;
    }
  }

  private isDuplicateKeyError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const code = (err as any).driverError?.code ?? (err as any).code;
    return code === 'ER_DUP_ENTRY' || code === '23505';
  }

  // ER_LOCK_DEADLOCK (MySQL 1213) e ER_LOCK_WAIT_TIMEOUT (1205) acontecem quando duas
  // transações concorrentes disputam o gap-lock do índice único de dedupeKey antes de
  // qualquer uma commitar. Isso NÃO é uma duplicidade de fato — é uma corrida — e vira
  // 500 se não for tratado.
  private isDeadlockError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const code = (err as any).driverError?.code ?? (err as any).code;
    const errno = (err as any).driverError?.errno ?? (err as any).errno;
    return code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT' || errno === 1213 || errno === 1205;
  }

  // separa o evento pelo tipo e chama o handler certo
  private async process(payload: LeraBoxWebhookPayload) {
    switch (payload.event) {
      case 'PAYMENT_PIX':
      case 'PAYMENT_CARD':
        return this.processPayment(payload);
      case 'WITHDRAWAL':
        return this.processWithdrawal(payload);
      default:
        this.logger.warn(`Tipo de evento não reconhecido: ${payload.event}`);
    }
  }

  // atualiza o pedido, se o status mudou reflete isso no link tambem
  private async processPayment(payload: LeraBoxWebhookPayload) {
    const order = payload.externalReference
      ? await this.checkoutService.getOrderByExternalReference(payload.externalReference)
      : null;

    if (!order) {
      this.logger.warn(
        `Pedido não encontrado para conciliação (externalReference=${payload.externalReference}, gatewayId=${payload.id})`,
      );
      return;
    }

    order.status = mapGatewayStatusToOrderStatus(payload.status);
    if (!order.gatewayPaymentId) order.gatewayPaymentId = payload.id;
    await this.checkoutService.saveOrder(order);
    await this.transactionsService.upsertFromOrder(order, 'webhook');

    const link = await this.checkoutService.getLinkById(order.checkoutLinkId);
    const newLinkStatus = linkStatusForOrderStatus(order.status);
    if (link && newLinkStatus && link.status !== newLinkStatus) {
      link.status = newLinkStatus;
      await this.checkoutService.saveLink(link);
    }
  }

  // Mesma coisa mas atualiza o saque encontrado pelo id que o gateway usa
  private async processWithdrawal(payload: LeraBoxWebhookPayload) {
    const withdrawal = await this.withdrawalsService.findByGatewayId(payload.id);
    if (!withdrawal) {
      this.logger.warn(`Saque não encontrado para conciliação (gatewayId=${payload.id})`);
      return;
    }
    withdrawal.status = mapGatewayWithdrawalStatus(payload.status);
    await this.withdrawalsService.save(withdrawal);
    await this.transactionsService.upsertFromWithdrawal(withdrawal, 'webhook');
  }
}
