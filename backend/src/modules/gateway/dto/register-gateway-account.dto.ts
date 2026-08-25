import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Length, Matches, MinLength } from 'class-validator';
import { GatewayPersonType } from '../gateway-account.entity';

export class RegisterGatewayAccountDto {
  @ApiProperty({ enum: GatewayPersonType, example: GatewayPersonType.PJ })
  @IsEnum(GatewayPersonType, { message: 'Informe se é Pessoa Física (PF) ou Pessoa Jurídica (PJ).' })
  personType: GatewayPersonType;

  @ApiProperty({ example: '12345678000199', description: 'CPF (11 dígitos) ou CNPJ (14 dígitos), somente números' })
  @IsString({ message: 'Informe o CPF ou CNPJ.' })
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'O CPF/CNPJ deve conter exatamente 11 (CPF) ou 14 (CNPJ) dígitos.' })
  document: string;

  @ApiProperty({ example: 'contato@minhaloja.com.br', description: 'E-mail real, usado pelo gateway para enviar as credenciais' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: '+5511999998888', description: 'Telefone real' })
  @IsString({ message: 'Informe um telefone válido.' })
  @Matches(/^\+?\d{10,13}$/, { message: 'Informe um telefone válido, com DDD (10 a 13 dígitos).' })
  phone: string;

  @ApiProperty({ example: 'Loja da Maria LTDA' })
  @IsString({ message: 'Informe o nome ou razão social.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  name: string;

  @ApiProperty({ example: '01310100', description: 'CEP com 8 dígitos, somente números, sem traço' })
  @IsString({ message: 'Informe o CEP.' })
  @Matches(/^\d{8}$/, { message: 'O CEP deve conter exatamente 8 dígitos, sem traço.' })
  zipCode: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  @IsString({ message: 'Informe o endereço.' })
  @MinLength(3, { message: 'O endereço deve ter pelo menos 3 caracteres.' })
  address: string;

  @ApiProperty({ example: '1000' })
  @IsString({ message: 'Informe o número do endereço.' })
  @MinLength(1, { message: 'Informe o número do endereço.' })
  number: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString({ message: 'Informe o bairro.' })
  @MinLength(2, { message: 'O bairro deve ter pelo menos 2 caracteres.' })
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString({ message: 'Informe a cidade.' })
  @MinLength(2, { message: 'A cidade deve ter pelo menos 2 caracteres.' })
  city: string;

  @ApiProperty({ example: 'SP', description: 'UF com 2 letras' })
  @IsString({ message: 'Informe a UF.' })
  @Length(2, 2, { message: 'A UF deve ter exatamente 2 letras (ex.: SP).' })
  state: string;
}