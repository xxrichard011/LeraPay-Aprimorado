// Formato padrão de resposta paginada, devolvido por /checkout/orders,
// /checkout/links e /wallet/statement
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaymentMethod = 'PIX' | 'CARD';
export type OrderStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
export type CheckoutLinkStatus = 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'DENIED';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export interface GatewayStatus {
  registered: boolean;
  authenticated: boolean;
  codigoCliente?: string;
  chaveLoja?: string;
  document?: string;
  personType?: 'PF' | 'PJ';
}

export interface GatewayFee {
  brand: string;
  installments: number;
  feePercent: number;
}

export interface CheckoutLink {
  id: string;
  userId: string;
  method: PaymentMethod;
  amountCents: number;
  description?: string;
  status: CheckoutLinkStatus;
  feePercent?: string;
  installments?: number;
  expiresAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  checkoutLinkId: string;
  userId: string;
  externalReference: string;
  method: PaymentMethod;
  amountCents: number;
  feePercent?: string;
  installments?: number;
  status: OrderStatus;
  gatewayPaymentId?: string;
  gatewayTxid?: string;
  pixQrCodeBase64?: string;
  pixEmv?: string;
  createdAt: string;
}

export interface WalletBalance {
  balanceCents: number;
  balanceFormatted: string;
}

export interface WalletStatementItem {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  amountFormatted: string;
  // Percentual de taxa aplicado (apenas cartão)
  feePercent: number | null;
  // Valor líquido que fica disponivel na carteira após o desconto da taxa
  netAmountCents: number;
  netAmountFormatted: string;
  externalReference?: string;
  description?: string;
  createdAt: string;
  source: 'gateway' | 'local';
  local: {
    orderId: string;
    checkoutLinkId: string;
    method: string;
    status: string;
    feePercent: string | null;
  } | null;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amountCents: number;
  pixKey?: string;
  destinationBank?: string;
  destinationAgency?: string;
  destinationAccount?: string;
  status: WithdrawalStatus;
  gatewayWithdrawalId?: string;
  createdAt: string;
}
