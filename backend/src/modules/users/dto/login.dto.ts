import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'maria@email.com.br' })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email: string;

  @ApiProperty({ example: 'SenhaForte123' })
  @IsString({ message: 'Informe sua senha.' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  password: string;
}
