import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { cardBrandLabel, detectCardBrand } from '../../common/card/card-brand.util';
import { EmailService } from '../../common/email/email.service';
import {
  OrderStatus,
  PaymentMethod,
} from '../../common/enums/order-status.enum';
import { buildPaginatedResult, PaginatedResult } from '../../common/pagination/pagination.util';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { ReceiptService } from '../../common/pdf/receipt.service';
import { GatewayAuthService } from '../gateway/gateway-auth.service';
import { GatewayHttpService } from '../gateway/gateway-http.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateCheckoutLinkDto } from './dto/create-checkout-link.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { PayWithCardDto } from './dto/pay-with-card.dto';
import { CheckoutLink, CheckoutLinkStatus } from './entities/checkout-link.entity';
import { Order } from './entities/order.entity';

//Formata centavos pra reais no padrão brasileiro (exemplo: 1099 -> "R$ 10,99")
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function linkStatusForOrderStatus(status: OrderStatus): CheckoutLinkStatus | null {
  switch (status) {
    case OrderStatus.APPROVED:
      return CheckoutLinkStatus.PAID;
    case OrderStatus.DENIED:
      return CheckoutLinkStatus.DENIED;
    case OrderStatus.EXPIRED:
      return CheckoutLinkStatus.EXPIRED;
    case OrderStatus.CANCELLED:
      return CheckoutLinkStatus.CANCELLED;
    default:
      return null;
  }
}

// Tempo que o link de cartão fica aberto até expirar sozinho (Pix não usa isso)
const DEFAULT_CARD_LINK_EXPIRATION_MINUTES = 2;

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(CheckoutLink)
    private readonly linksRepo: Repository<CheckoutLink>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    private readonly gatewayAuth: GatewayAuthService,
    private readonly gatewayHttp: GatewayHttpService,
    private readonly emailService: EmailService,
    private readonly receiptService: ReceiptService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /* Criador do link, se for Pix ja manda pro gateway na hora (o QR sai pronto)
   se for cartão fica esperando o pagador preencher os dados por 2min */
  async createLink(userId: string, dto: CreateCheckoutLinkDto) {
    const expiresInMinutes =
      dto.expiresInMinutes ??
      (dto.method === PaymentMethod.CARD ? DEFAULT_CARD_LINK_EXPIRATION_MINUTES : undefined);

    const link = this.linksRepo.create({
      userId,
      method: dto.method,
      amountCents: dto.amountCents,
      description: dto.description,
      status: CheckoutLinkStatus.OPEN,
      expiresAt: expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60_000) : undefined,
    });
    await this.linksRepo.save(link);

    if (dto.method === PaymentMethod.PIX) {
      const order = await this.createPixOrder(userId, link, dto.payerDocument);
      return { link, order };
    }

    // se for cartão o link fica aberto esperando os dados
    return { link, order: null };
  }

  // cria o order local e ja dispara o pagamento pix no gatewa e o QR sai pronto
  private async createPixOrder(
    userId: string,
    link: CheckoutLink,
    payerDocument: string,
  ): Promise<Order> {
    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);

    const order = this.ordersRepo.create({
      checkoutLinkId: link.id,
      userId,
      externalReference: link.id,
      method: PaymentMethod.PIX,
      amountCents: link.amountCents,
      status: OrderStatus.PENDING,
    });
    await this.ordersRepo.save(order);

    const pixResponse = await this.gatewayHttp.createPixPayment(accessToken, {
      amount: link.amountCents,
      payerDocument,
      externalReference: link.id,
      description: link.description,
    });

    order.gatewayPaymentId = pixResponse.id;
    order.gatewayTxid = pixResponse.txid;
    order.pixQrCodeBase64 = pixResponse.qrCodeBase64;
    order.pixEmv = pixResponse.emv;
    // O PDF do desafio (seção 3.6) pede pra tratar o retorno DEFINITIVO de Pix e
    // cartão por webhook - a resposta síncrona da criação só traz QR/EMV/txid,
    // não é garantia de status final (mesmo que o sandbox às vezes já devolva
    // resolvido). Por isso não usamos pixResponse.status aqui: o pedido fica
    // PENDING até o webhook confirmar (ou, se o sandbox já mandar aprovado/negado
    // por webhook quase na hora, o usuário nem percebe diferença).
    await this.ordersRepo.save(order);
    await this.transactionsService.upsertFromOrder(order, 'active_query');

    const newLinkStatus = linkStatusForOrderStatus(order.status);
    if (newLinkStatus && link.status !== newLinkStatus) {
      link.status = newLinkStatus;
      await this.linksRepo.save(link);
    }

    return order;
  }

  /* Expira o link sozinho quando passa do prazo, cria aqui um order só local já em EXPIRED,
     isso só aparece no histórico de transação */
  private async expireIfPastDeadline(link: CheckoutLink): Promise<CheckoutLink> {
    if (link.status !== CheckoutLinkStatus.OPEN) return link;
    if (!link.expiresAt || link.expiresAt.getTime() > Date.now()) return link;

    link.status = CheckoutLinkStatus.EXPIRED;
    await this.linksRepo.save(link);

    const order = await this.ordersRepo.findOne({ where: { checkoutLinkId: link.id } });
    if (order) {
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.EXPIRED;
        await this.ordersRepo.save(order);
        await this.transactionsService.upsertFromOrder(order, 'local');
      }
    } else {
      const localOnlyOrder = this.ordersRepo.create({
        checkoutLinkId: link.id,
        userId: link.userId,
        externalReference: link.id,
        method: link.method,
        amountCents: link.amountCents,
        status: OrderStatus.EXPIRED,
      });
      await this.ordersRepo.save(localOnlyOrder);
      await this.transactionsService.upsertFromOrder(localOnlyOrder, 'local');
    }

    return link;
  }

  /* Cancelamento manual, só deixa cancelar se o link ainda ta aberto (dentro dos 2min),
     após feito vai para CANCELLED no histórico */
  async cancelLink(userId: string, linkId: string) {
    const link = await this.linksRepo.findOne({ where: { id: linkId, userId } });
    if (!link) throw new NotFoundException('Link de checkout não encontrado');

    await this.expireIfPastDeadline(link);

    if (link.status !== CheckoutLinkStatus.OPEN) {
      throw new BadRequestException(
        `Link não pode ser cancelado (status atual=${link.status}). Só é possível cancelar links abertos.`,
      );
    }

    const order = await this.ordersRepo.findOne({ where: { checkoutLinkId: link.id } });
    if (order && (order.status === OrderStatus.APPROVED || order.status === OrderStatus.DENIED)) {
      /* isso na teoria nunca deveria acontecer com link aberto, mas fica
         aqui de garantia mesmo assim, nunca cancela pedido que já fechou */
      throw new BadRequestException('Este link já possui um pedido com resultado definitivo e não pode ser cancelado');
    }

    link.status = CheckoutLinkStatus.CANCELLED;
    await this.linksRepo.save(link);

    let resultOrder = order;
    if (order) {
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CANCELLED;
        await this.ordersRepo.save(order);
      }
    } else {
      resultOrder = await this.ordersRepo.save(
        this.ordersRepo.create({
          checkoutLinkId: link.id,
          userId: link.userId,
          externalReference: link.id,
          method: link.method,
          amountCents: link.amountCents,
          status: OrderStatus.CANCELLED,
        }),
      );
    }
    if (resultOrder) {
      await this.transactionsService.upsertFromOrder(resultOrder, 'local');
    }

    return { link, order: resultOrder };
  }

  // pedidos que nunca foram mandados pro gateway (sem gatewayPaymentId), tipo que não existem no extrato de lá e não mexeram no saldo. 
  // o Walletmodule usa isso pra juntar EXPIRED/CANCELLED que nunca chegaram a sair.
  async listLocalOnlyOrders(
    userId: string,
    filter: { status?: OrderStatus; method?: PaymentMethod },
  ): Promise<Order[]> {
    return this.ordersRepo.find({
      where: {
        userId,
        gatewayPaymentId: IsNull(),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.method ? { method: filter.method } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async payWithCard(userId: string, linkId: string, dto: PayWithCardDto) {
    let link = await this.linksRepo.findOne({ where: { id: linkId, userId } });
    if (!link) throw new NotFoundException('Link de checkout não encontrado');
    if (link.method !== PaymentMethod.CARD) {
      throw new BadRequestException('Este link não é do método cartão');
    }

    link = await this.expireIfPastDeadline(link);

    if (link.status !== CheckoutLinkStatus.OPEN) {
      throw new BadRequestException(`Link não está aberto para pagamento (status=${link.status})`);
    }

    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);

    // confere se numero do cartão bate com a bandeira escolhida antes de chamar no gateway
    const detectedBrand = detectCardBrand(dto.card.number);
    if (!detectedBrand) {
      throw new BadRequestException(
        'Não foi possível identificar a bandeira deste cartão. Bandeiras aceitas: Visa, Mastercard ou Elo.',
      );
    }
    if (detectedBrand !== dto.brand) {
      throw new BadRequestException(
        `O número do cartão informado parece ser da bandeira ${cardBrandLabel(detectedBrand)}, mas foi selecionada ${cardBrandLabel(dto.brand as 'VISA' | 'MASTERCARD' | 'ELO')}. Selecione a bandeira correta antes de continuar.`,
      );
    }

    //Pega a taxa certa na tabela do gateway e confere/resolve o feePercent
    const fees = await this.gatewayHttp.getFees(dto.brand);
    const match = fees.find((f) => f.installments === dto.installments);
    if (!match) {
      throw new BadRequestException(
        `Não há taxa cadastrada no gateway para ${dto.installments}x${dto.brand ? ` (bandeira ${dto.brand})` : ''}`,
      );
    }
    if (dto.feePercent !== undefined && Math.abs(dto.feePercent - match.feePercent) > 0.001) {
      throw new BadRequestException(
        `feePercent divergente do gateway: enviado ${dto.feePercent}, esperado ${match.feePercent}`,
      );
    }
    const feePercent = dto.feePercent ?? match.feePercent;

    // Reaproveita o pedido que jaa existe pra esse link ao inves de criar outro
    let order = await this.ordersRepo.findOne({ where: { checkoutLinkId: link.id } });
    if (order && order.status === OrderStatus.APPROVED) {
      throw new BadRequestException('Este link já possui um pagamento aprovado');
    }

    if (order) {
      order.method = PaymentMethod.CARD;
      order.amountCents = link.amountCents;
      order.feePercent = feePercent.toFixed(2);
      order.installments = dto.installments;
      order.status = OrderStatus.PENDING;
    } else {
      order = this.ordersRepo.create({
        checkoutLinkId: link.id,
        userId,
        externalReference: link.id,
        method: PaymentMethod.CARD,
        amountCents: link.amountCents,
        feePercent: feePercent.toFixed(2),
        installments: dto.installments,
        status: OrderStatus.PENDING,
      });
    }
    await this.ordersRepo.save(order);

    let cardResponse;
    try {
      cardResponse = await this.gatewayHttp.createCardPayment(accessToken, {
        amount: link.amountCents,
        installments: dto.installments,
        feePercent,
        externalReference: link.id,
        cardNumber: dto.card.number,
        cardHolder: dto.card.holderName,
        expiryMonth: String(dto.card.expMonth).padStart(2, '0'),
        expiryYear: String(dto.card.expYear),
        cvv: dto.card.cvv,
      });
    } catch (err) {
      /*  Sem isso o pedido ficava travado em PENDING e a proxima tentativa
        ia bater no externalReference (Duplicate Entry). */
      order.status = OrderStatus.DENIED;
      await this.ordersRepo.save(order);
      await this.transactionsService.upsertFromOrder(order, 'active_query');
      const deniedLinkStatus = linkStatusForOrderStatus(order.status);
      if (deniedLinkStatus) {
        link.status = deniedLinkStatus;
        await this.linksRepo.save(link);
      }
      throw err;
    }

    order.gatewayPaymentId = cardResponse.id;
    // Mesma decisão do Pix: o status definitivo vem por webhook (seção 3.6 do PDF),
    // não pela resposta síncrona de criação. O pedido fica PENDING até o webhook
    // confirmar aprovação ou negação.
    await this.ordersRepo.save(order);
    await this.transactionsService.upsertFromOrder(order, 'active_query');

    link.feePercent = feePercent.toFixed(2);
    link.installments = dto.installments;
    await this.linksRepo.save(link);

    return order;
  }

  // busca o link e o pedido mais recente associado, checando expiração antes de devolver
  async getLink(userId: string, linkId: string) {
    let link = await this.linksRepo.findOne({ where: { id: linkId, userId } });
    if (!link) throw new NotFoundException('Link de checkout não encontrado');
    link = await this.expireIfPastDeadline(link);
    const order = await this.ordersRepo.findOne({
      where: { checkoutLinkId: linkId },
      order: { createdAt: 'DESC' },
    });
    return { link, order };
  }

  async listLinks(userId: string, query: PaginationQueryDto = {}): Promise<PaginatedResult<CheckoutLink>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await this.linksRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return buildPaginatedResult(items, total, page, pageSize);
  }

  // Listagem local ds filtros da tela, agora paginada (antes devolvia tudo de uma vez, sem limite)
  async listOrders(userId: string, query: ListOrdersQueryDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await this.ordersRepo.findAndCount({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.method ? { method: query.method } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return buildPaginatedResult(items, total, page, pageSize);
  }

  async getOrderByExternalReference(externalReference: string): Promise<Order | null> {
    return this.ordersRepo.findOne({ where: { externalReference } });
  }

  async saveOrder(order: Order): Promise<Order> {
    return this.ordersRepo.save(order);
  }

  async getLinkById(linkId: string): Promise<CheckoutLink | null> {
    return this.linksRepo.findOne({ where: { id: linkId } });
  }

  async saveLink(link: CheckoutLink): Promise<CheckoutLink> {
    return this.linksRepo.save(link);
  }

  // Envia o link/QRcode de pagamento por email . 
  async sendLinkByEmail(userId: string, linkId: string, to: string) {
    const { link, order } = await this.getLink(userId, linkId);
    return this.emailService.sendPaymentLink({
      to,
      amountFormatted: formatCents(link.amountCents),
      description: link.description,
      method: link.method,
      pixEmv: order?.pixEmv,
      pixQrCodeBase64: order?.pixQrCodeBase64,
      checkoutUrl: `${process.env.PUBLIC_BASE_URL ?? ''}/checkout/links/${link.id}`,
    });
  }

  //Comprovante de pagamento em PDF pra um pedido aprovado
  async generateReceipt(userId: string, orderId: string): Promise<Buffer> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException('Só é possível emitir comprovante de pedidos aprovados');
    }
    return this.receiptService.generate({
      order,
      amountFormatted: formatCents(order.amountCents),
    });
  }
}
