import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Bandeiras suportadas pelo gateway
export const SUPPORTED_CARD_BRANDS = ['VISA', 'MASTERCARD', 'ELO'] as const;

class CardDataDto {
  @ApiProperty({ example: 'MARIA A SILVA' })
  @IsString({ message: 'Informe o nome impresso no cartão.' })
  @Length(3, 100, { message: 'O nome impresso no cartão deve ter entre 3 e 100 caracteres.' })
  @Matches(/^[\p{L}\s]+$/u, { message: 'O nome impresso no cartão deve conter apenas letras.' })
  holderName: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString({ message: 'Informe o número do cartão.' })
  @Length(13, 19, { message: 'O número do cartão deve ter entre 13 e 19 dígitos.' })
  number: string;

  @ApiProperty({ example: 12 })
  @IsInt({ message: 'O mês de validade deve ser um número entre 1 e 12.' })
  @Min(1, { message: 'O mês de validade deve ser um número entre 1 e 12.' })
  @Max(12, { message: 'O mês de validade deve ser um número entre 1 e 12.' })
  expMonth: number;

  @ApiProperty({ example: 2030 })
  @IsInt({ message: 'O ano de validade é inválido.' })
  @Min(new Date().getFullYear(), { message: 'O cartão informado está com a validade vencida.' })
  @Max(new Date().getFullYear() + 20, { message: 'O ano de validade é inválido.' })
  expYear: number;

  @ApiProperty({ example: '123' })
  @IsString({ message: 'Informe o CVV do cartão.' })
  @Length(3, 4, { message: 'O CVV deve ter 3 ou 4 dígitos.' })
  cvv: string;
}

export class PayWithCardDto {
  @ApiProperty({
    example: '12345678900',
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do pagador, somente números',
  })
  @IsString({ message: 'Informe o CPF ou CNPJ do pagador.' })
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'O CPF/CNPJ do pagador deve conter exatamente 11 (CPF) ou 14 (CNPJ) dígitos.',
  })
  payerDocument: string;

  @ApiProperty({ example: 3, description: 'Número de parcelas (1 a 21, conforme /api/fees)' })
  @IsInt({ message: 'Selecione um número de parcelas válido.' })
  @Min(1, { message: 'O número de parcelas deve ser entre 1 e 21.' })
  @Max(21, { message: 'O número de parcelas deve ser entre 1 e 21.' })
  installments: number;

  @ApiProperty({
    example: 'VISA',
    enum: SUPPORTED_CARD_BRANDS,
    description:
      'Bandeira do cartão. Usada para consultar a taxa correta em /api/fees?brand= e é enviada ao gateway para processar o pagamento com a bandeira certa.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(SUPPORTED_CARD_BRANDS, {
    message: `Bandeira não suportada. Escolha uma das opções: ${SUPPORTED_CARD_BRANDS.join(', ')}.`,
  })
  brand: string;

  @ApiProperty({
    required: false,
    description:
      'Percentual de taxa esperado. Se enviado, é validado contra /api/fees; se divergente, a requisição é rejeitada. Se omitido, é resolvido automaticamente pelo backend.',
  })
  @IsOptional()
  @IsPositive({ message: 'A taxa informada é inválida.' })
  feePercent?: number;

  @ApiProperty({ type: CardDataDto })
  @ValidateNested()
  @Type(() => CardDataDto)
  card: CardDataDto;
}
