import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches, Min } from 'class-validator';
import { PaymentMethod } from '../../../common/enums/order-status.enum';

export class CreateCheckoutLinkDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod, { message: 'Escolha um método de pagamento válido: Pix ou Cartão.' })
  method: PaymentMethod;

  @ApiProperty({ example: 5000, description: 'Valor em centavos (R$ 50,00 = 5000)' })
  @IsInt({ message: 'O valor deve ser um número inteiro em centavos.' })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  amountCents: number;

  @ApiProperty({
    example: '12345678900',
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do pagador, somente números',
  })
  @IsString({ message: 'Informe o CPF ou CNPJ do pagador.' })
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'O CPF/CNPJ do pagador deve conter exatamente 11 (CPF) ou 14 (CNPJ) dígitos.',
  })
  payerDocument: string;

  @ApiProperty({ required: false, example: 'Pedido #1234' })
  @IsOptional()
  @IsString({ message: 'A descrição informada é inválida.' })
  description?: string;

  @ApiProperty({
    required: false,
    example: 30,
    description: 'Minutos até a expiração do link (apenas informativo/local; o Pix expira conforme o gateway)',
  })
  @IsOptional()
  @IsInt({ message: 'O tempo de expiração deve ser um número inteiro de minutos.' })
  @Min(1, { message: 'O tempo de expiração deve ser de pelo menos 1 minuto.' })
  expiresInMinutes?: number;
}
