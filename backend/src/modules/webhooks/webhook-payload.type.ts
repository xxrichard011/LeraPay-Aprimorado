// Formato do corpo dos webhooks do Lera Box. 
export interface LeraBoxWebhookPayload {
  event: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL';
  id: string; // id da transação/saque no gateway (gatewayPaymentId / gatewayWithdrawalId)
  status: string; // tipo APPROVED, DENIED, EXPIRED, CANCELLED
  externalReference?: string;
  amountCents?: number;
  occurredAt?: string;
}
