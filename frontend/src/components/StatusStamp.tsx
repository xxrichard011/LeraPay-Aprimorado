const LABELS: Record<string, string> = {
  APPROVED: 'Sucesso',
  DENIED: 'Falha',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendente',
  OPEN: 'Aberto',
  PAID: 'Pago',
};

export function StatusStamp({ status }: { status: string }) {
  const cls = status.toLowerCase();
  return <span className={`stamp ${cls}`}>{LABELS[status] ?? status}</span>;
}
