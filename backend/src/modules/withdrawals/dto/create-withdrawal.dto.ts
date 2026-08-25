import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

// Aceita apenas os três formatos de chave Pix: CPF (11 digitos) ou CNPJ (14 digitos) 
// E-mail ou telefone (10 ou 11 digito)
const PIX_KEY_PATTERN = /^(\d{10,11}|\d{14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export class CreateWithdrawalDto {
  @ApiProperty({ example: 10000, description: 'Valor em centavos' })
  @IsInt({ message: 'O valor do saque deve ser um número inteiro em centavos.' })
  @IsPositive({ message: 'O valor do saque deve ser maior que zero.' })
  amountCents: number;

  @ApiProperty({
    example: 'usuario@pix.com',
    description:
      'Chave Pix de destino: CPF, CNPJ, e-mail ou telefone. O gateway não suporta saque para ' +
      'conta bancária (somente Pix), então este campo é obrigatório.',
  })
  @IsString({ message: 'A chave Pix informada é invalida.' })
  @Matches(PIX_KEY_PATTERN, {
    message: 'Chave Pix invalida: informe um CPF, CNPJ, e-mail ou telefone validos.',
  })
  pixKey: string;

  @ApiProperty({
    required: false,
    example: '12345678900',
    description:
      'CPF (11 dígitos) do responsável pelo saque. Obrigatório quando a conta do gateway é Pessoa Jurídica, ' +
      'já que o endpoint de saque do gateway só aceita CPF nesse campo, mesmo para lojistas PJ.',
  })
  @IsOptional()
  @IsString({ message: 'Informe o CPF do responsável pelo saque.' })
  @Matches(/^\d{11}$/, { message: 'O CPF do responsável deve ter exatamente 11 dígitos.' })
  requesterDocument?: string;
}
