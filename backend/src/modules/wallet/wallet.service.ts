import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import { paginateArray } from '../../common/pagination/pagination.util';
import { CheckoutService } from '../checkout/checkout.service';
import { GatewayAuthService } from '../gateway/gateway-auth.service';
import { GatewayHttpService } from '../gateway/gateway-http.service';
import { WalletStatementQueryDto } from './dto/wallet-statement-query.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly gatewayAuth: GatewayAuthService,
    private readonly gatewayHttp: GatewayHttpService,
    private readonly checkoutService: CheckoutService,
  ) {}

  // Saldo direto do gateway ja formatado pra exibir na tela
  async getBalance(userId: string) {
    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
    const wallet = await this.gatewayHttp.getWallet(accessToken);
    return {
      balanceCents: wallet.balanceCents,
      balanceFormatted: this.formatCents(wallet.balanceCents),
    };
  }

  /* Extrato consolidado: pega o extrato bruto do gateway (GET /wallet/transactions) e 
  // completa cada item, quando dá, com o pedido local correspondente (via externalReference),
  // também junta os pedidos (EXPIRED/CANCELLED )que nunca chegaram a ser mandados pro gateway. */
  async getStatement(userId: string, query: WalletStatementQueryDto) {
    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
    const transactions = await this.gatewayHttp.getWalletTransactions(accessToken, {
      status: query.status,
      type: query.type,
      // Antes era 50 (default do DTO), fazendo transações recentes ficarem de fora
      // quando havia muito movimento. Agora busca o máximo permitido antes de paginar.
      limit: query.limit ?? 200,
    });

    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        const localOrder = tx.externalReference
          ? await this.checkoutService.getOrderByExternalReference(tx.externalReference)
          : null;

        // Taxa do pedido
        const feePercent = localOrder?.feePercent ? Number(localOrder.feePercent) : null;
        const netAmountCents =
          feePercent !== null ? Math.round(tx.amountCents * (1 - feePercent / 100)) : tx.amountCents;

        return {
          ...tx,
          amountFormatted: this.formatCents(tx.amountCents),
          feePercent,
          netAmountCents,
          netAmountFormatted: this.formatCents(netAmountCents),
          source: 'gateway' as const,
          local: localOrder
            ? {
                orderId: localOrder.id,
                checkoutLinkId: localOrder.checkoutLinkId,
                method: localOrder.method,
                status: localOrder.status,
                feePercent: localOrder.feePercent ?? null,
              }
            : null,
        };
      }),
    );

    const localOnlyStatusFilter = this.mapStatusFilter(query.status);
    const localOnlyMethodFilter = this.mapMethodFilter(query.type);
    const localOnlyOrders = await this.checkoutService.listLocalOnlyOrders(userId, {
      status: localOnlyStatusFilter,
      method: localOnlyMethodFilter,
    });

    const localOnly = localOnlyOrders.map((order) => ({
      id: `local-order-${order.id}`,
      type: order.method,
      status: order.status,
      amountCents: order.amountCents,
      amountFormatted: this.formatCents(order.amountCents),
      feePercent: null,
      // Nunca foi enviado pro gateway / n movimentou saldo nenhum
      netAmountCents: 0,
      netAmountFormatted: this.formatCents(0),
      externalReference: order.externalReference,
      description: 'Não enviado ao gateway — pagador não concluiu o pagamento',
      createdAt: order.createdAt.toISOString(),
      source: 'local' as const,
      local: {
        orderId: order.id,
        checkoutLinkId: order.checkoutLinkId,
        method: order.method,
        status: order.status,
        feePercent: null,
      },
    }));

    const merged = [...enriched, ...localOnly].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return paginateArray(merged, query.page ?? 1, query.pageSize ?? 10);
  }

  //Valida se o status que veio na query é um dos nossos status locais conhecidos, se não ignora o filtro
  private mapStatusFilter(status?: string): OrderStatus | undefined {
    const normalized = status?.toUpperCase().trim();
    return normalized && (Object.values(OrderStatus) as string[]).includes(normalized)
      ? (normalized as OrderStatus)
      : undefined;
  }

  // mesma ideia do anterior, mas pro metodo de pagamento
  private mapMethodFilter(type?: string): PaymentMethod | undefined {
    const normalized = type?.toUpperCase().trim();
    return normalized && (Object.values(PaymentMethod) as string[]).includes(normalized)
      ? (normalized as PaymentMethod)
      : undefined;
  }

  private formatCents(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
