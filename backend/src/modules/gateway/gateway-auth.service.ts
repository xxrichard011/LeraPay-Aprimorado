import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { RegisterGatewayAccountDto } from './dto/register-gateway-account.dto';
import { LoginGatewayAccountDto } from './dto/login-gateway-account.dto';
import { GatewayAccount } from './gateway-account.entity';
import { GatewayHttpService } from './gateway-http.service';

@Injectable()
export class GatewayAuthService {
  constructor(
    @InjectRepository(GatewayAccount)
    private readonly accountsRepo: Repository<GatewayAccount>,
    private readonly gatewayHttp: GatewayHttpService,
    private readonly encryption: EncryptionService,
    private readonly jwtService: JwtService,
  ) {}

  // Cadastro publico no gateway
  // chegara uma mensagem por email contendo o Acesso/Senha/CodigoCliente/ChaveLoja
  // Para usar depois no login.
  async registerOnGateway(userId: string, dto: RegisterGatewayAccountDto) {
    const response = await this.gatewayHttp.registerUser({
      personType: dto.personType,
      document: dto.document,
      email: dto.email,
      phone: dto.phone,
      name: dto.name,
      zipCode: dto.zipCode,
      address: dto.address,
      number: dto.number,
      neighborhood: dto.neighborhood,
      city: dto.city,
      state: dto.state,
    });

    let account = await this.accountsRepo.findOne({ where: { userId } });
    if (!account) {
      account = this.accountsRepo.create({ userId });
    }
    account.personType = dto.personType;
    account.document = dto.document;
    account.gatewayEmail = dto.email;
    account.phone = dto.phone;
    account.isRegistered = true;
    await this.accountsRepo.save(account);

    return { message: response.message ?? 'Cadastro enviado ao gateway. Verifique seu e-mail.' };
  }

  /* Login no gateway com o acesso e senha que vierem no email
    CodigoCliente e ChaveLoja ficam salvos cifrados aqui a senha também fica salva (cifrada)
    Só pra dar pra fazer o relog automatico e sozinho quando o token expirar */
  async loginOnGateway(userId: string, dto: LoginGatewayAccountDto) {
    const account = await this.accountsRepo.findOne({ where: { userId } });
    if (!account) {
      throw new NotFoundException(
        'Nenhum cadastro no gateway encontrado para este usuário. Registre-se primeiro.',
      );
    }

    const loginResponse = await this.gatewayHttp.login({
      document: dto.document,
      password: dto.password,
    });

    account.codigoCliente = String(loginResponse.codigoCliente);
    account.chaveLoja = loginResponse.chaveLoja;
    account.accessTokenEncrypted = this.encryption.encrypt(loginResponse.access_token);
    account.passwordEncrypted = this.encryption.encrypt(dto.password);
    account.tokenIssuedAt = new Date();
    await this.accountsRepo.save(account);

    return {
      message: 'Login no gateway realizado com sucesso.',
      codigoCliente: account.codigoCliente,
      chaveLoja: account.chaveLoja,
    };
  }

  //usado na tela de setup pra saber se o user ja tem conta no gateway e se ainda ta logado ou n
  async getStatus(userId: string) {
    const account = await this.accountsRepo.findOne({ where: { userId } });
    if (!account) {
      return { registered: false, authenticated: false };
    }
    return {
      registered: account.isRegistered,
      authenticated: Boolean(account.accessTokenEncrypted),
      codigoCliente: account.codigoCliente,
      chaveLoja: account.chaveLoja,
      document: account.document,
      personType: account.personType,
    };
  }

  // Função pra pegar o bearer token em texto puro na hora de chamar o gateway.
  async resolveAccessToken(userId: string): Promise<string> {
    const account = await this.accountsRepo.findOne({ where: { userId } });
    if (!account?.accessTokenEncrypted) {
      throw new NotFoundException(
        'Conta do gateway não autenticada. Faça login no gateway antes de continuar.',
      );
    }

    const currentToken = this.encryption.decrypt(account.accessTokenEncrypted);

    // Token do gateway é um JWT e decodifica local sem checar assinatura
    // utilizado só pra saber se ta perto de vencer e renova sozinho, sem precisar pedir login de novo pro user
    const decoded = this.jwtService.decode(currentToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : 0;
    const isExpiringSoon = !expiresAt || expiresAt - Date.now() < 60_000;

    if (!isExpiringSoon) {
      return currentToken;
    }

    if (!account.passwordEncrypted) {
      // não tem senha salva pra renovar sozinho, entao devolve o token atual
      // mesmo e deixa o gateway recusar (ae o usuário faz login de novo)
      return currentToken;
    }

    return this.refreshToken(userId);
  }

  // faz login de novo com a senha salva (cifrada) pra tirar um token novo
  async refreshToken(userId: string): Promise<string> {
    const account = await this.accountsRepo.findOne({ where: { userId } });
    if (!account?.passwordEncrypted) {
      throw new NotFoundException('Sem credenciais salvas para renovar o token automaticamente.');
    }
    const password = this.encryption.decrypt(account.passwordEncrypted);
    const loginResponse = await this.gatewayHttp.login({ document: account.document, password });
    account.accessTokenEncrypted = this.encryption.encrypt(loginResponse.access_token);
    account.tokenIssuedAt = new Date();
    await this.accountsRepo.save(account);
    return loginResponse.access_token;
  }

  async findAccountByUserId(userId: string): Promise<GatewayAccount | null> {
    return this.accountsRepo.findOne({ where: { userId } });
  }
}
