// Converte centavos pra reais formatado (ex: 4099 -> "R$ 40,99")
export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// normaliza o QR Pix que vem do gateway pra usar em img src.
export function toQrCodeImageSrc(qrCodeBase64: string): string {
  if (qrCodeBase64.startsWith('data:image')) return qrCodeBase64;
  return `data:image/png;base64,${qrCodeBase64}`;
}

// formata data ISO pro formato brasileiro de data e hora
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}
