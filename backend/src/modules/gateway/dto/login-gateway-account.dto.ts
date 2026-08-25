import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class LoginGatewayAccountDto {
  @ApiProperty({ example: '12345678000199' })
  @IsString({ message: 'Informe o CPF ou CNPJ.' })
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'O CPF/CNPJ deve conter exatamente 11 (CPF) ou 14 (CNPJ) dígitos.' })
  document: string;

  @ApiProperty({ description: 'Senha recebida por e-mail do gateway' })
  @IsString({ message: 'Informe a senha recebida por e-mail do gateway.' })
  password: string;
}
