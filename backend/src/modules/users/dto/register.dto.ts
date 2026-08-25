import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ example: 'Loja do Joao' })
  @IsString({ message: 'Informe o seu nome ou o nome da loja.' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
  name: string;

  @ApiProperty({ example: 'joao@gmail.com.br' })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email: string;

  @ApiProperty({ example: 'SenhaForte123', minLength: 8 })
  @IsString({ message: 'Informe uma senha.' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  password: string;
}
