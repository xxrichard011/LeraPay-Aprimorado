// Tipos que espelham o contrato do gateway Lera Box

export interface GatewayRegisterPayload {
  personType: 'PF' | 'PJ';
  document: string;
  email: string;
  phone: string;
  name: string;
  zipCode: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface GatewayRegisterResponse {
  message: string;
}

export interface GatewayLoginPayload {
  document: string;
  password: string;
}

export interface GatewayLoginResponse {
  access_token: string;
  token_type: string;
  codigoCliente: number;
  chaveLoja: string;
  user: {
    id: string;
    personType: string;
    name: string;
    tradingName: string | null;
    email: string;
    document: string;
  };
}

export interface GatewayFee {
  brand: string;
  installments: number;
  feePercent: number;
}

export interface GatewayWalletResponse {
  balanceCents: number;
}

export interface GatewayWalletTransaction {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  externalReference?: string;
  description?: string;
  denialReason?: string | null;
  createdAt: string;
}

export interface GatewayWalletTransactionsQuery {
  status?: string;
  type?: string;
  limit?: number;
}

export interface GatewayPixPaymentPayload {
  amount: number;
  payerDocument: string;
  externalReference: string;
  description?: string;
}

export interface GatewayPixPaymentResponse {
  id: string;
  txid: string;
  qrCodeBase64: string;
  emv: string;
  status: string;
  expiresAt?: string;
}

export interface GatewayCardPaymentPayload {
  amount: number;
  installments: number;
  feePercent: number;
  externalReference: string;
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface GatewayCardPaymentResponse {
  id: string;
  status: string;
  installments: number;
  feePercent: number;
}

export interface GatewayPaymentStatusResponse {
  id: string;
  status: string;
  type: 'PIX' | 'CARD';
  amountCents: number;
  externalReference?: string;
}

export interface GatewayWithdrawalPayload {
  amount: number;
  document: string;
  pixKey: string;
}

export interface GatewayWithdrawalResponse {
  id: string;
  status: string;
}

export interface GatewayWebhookRegisterPayload {
  url: string;
  event: 'PAYMENT_PIX' | 'PAYMENT_CARD' | 'WITHDRAWAL';
}

export interface GatewayWebhookResponse {
  id: string;
  url: string;
  event: string;
  secret?: string;
}
