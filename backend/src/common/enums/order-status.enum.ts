/* Status definidos
    Sucesso   -> APPROVED
    Falha     -> DENIED
    Expirado  -> EXPIRED
    Cancelado -> CANCELLED
  PENDING é um estado interno que aguarda confirmação assincrona via webhook) */
export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'CARD',
}

// Normaliza o status vindo do gateway (texto livre) para o nosso enum interno
export function mapGatewayStatusToOrderStatus(gatewayStatus: string): OrderStatus {
  const normalized = gatewayStatus?.toUpperCase().trim();
  switch (normalized) {
    case 'APPROVED':
    case 'PAID':
    case 'SUCCESS':
      return OrderStatus.APPROVED;
    case 'DENIED':
    case 'FAILED':
    case 'REJECTED':
      return OrderStatus.DENIED;
    case 'EXPIRED':
      return OrderStatus.EXPIRED;
    case 'CANCELLED':
    case 'CANCELED':
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.PENDING;
  }
}
