export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO';

// Faixas de BIN (primeiros digitos do cartão) que uso pra detectar a bandeira.
// São os prefixos públicos que o mercado usa mesmo (Visa, Mastercard e Elo)
const ELO_REGEX =
  /^((636368|438935|504175|451416|636297|506699|509\d{3}|401178|401179|431274|457631|457632|627780)\d{0,13}|(5067|4576|4011)\d{0,15}|65\d{0,17})$/;
const VISA_REGEX = /^4\d{0,18}$/;
const MASTERCARD_REGEX =
  /^(5[1-5]\d{0,17}|222[1-9]\d{0,15}|22[3-9]\d{0,16}|2[3-6]\d{0,17}|27[01]\d{0,16}|2720\d{0,15})$/;

// Detecta a bandeira pelos digitos do cartão. 
// Checa Elo antes de Visa/Mastercard porque algumas faixas da Elo (tipo 4011, 4576) começam com o mesmo prefixo que a Visa.
export function detectCardBrand(rawValue: string): CardBrand | null {
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return null;
  if (ELO_REGEX.test(digits)) return 'ELO';
  if (VISA_REGEX.test(digits)) return 'VISA';
  if (MASTERCARD_REGEX.test(digits)) return 'MASTERCARD';
  return null;
}