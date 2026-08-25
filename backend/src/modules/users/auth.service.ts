import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register.dto';
import { UsersService } from './users.service';

export interface AuthResult {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // cria o user e ja vem logado com token, n precisa de um segundo login
  async register(dto: RegisterUserDto): Promise<AuthResult> {
    const user = await this.usersService.create(dto);
    return this.buildAuthResult(user.id, user.name, user.email);
  }

  async login(dto: LoginUserDto): Promise<AuthResult> {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.buildAuthResult(user.id, user.name, user.email);
  }

  // Gera o JWT do BaaS e monta a resposta padrão
  private buildAuthResult(id: string, name: string, email: string): AuthResult {
    const accessToken = this.jwtService.sign({ sub: id, email });
    return { accessToken, user: { id, name, email } };
  }
}
