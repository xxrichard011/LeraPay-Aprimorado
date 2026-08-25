import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { GatewayAuthService } from '../modules/gateway/gateway-auth.service';
import { GatewayAccount, GatewayPersonType } from '../modules/gateway/gateway-account.entity';

/**
 * Cria (ou reaproveita, se já existir) um usuário de demonstração do BaaS,
 * pronto pra entrega ao avaliador — sem precisar cadastrar conta na mão.
 *
 * Reaproveita os services reais da aplicação (UsersService, GatewayAuthService),
 * então a senha do usuário BaaS já sai com o mesmo hash bcrypt e as credenciais
 * do gateway já saem cifradas com AES-256-GCM, exatamente como no fluxo normal.
 *
 * Idempotente: pode rodar quantas vezes quiser, não duplica nem quebra nada.
 *
 * Uso:
 *   npm run seed:demo
 *
 * Variáveis de ambiente (todas opcionais, com default):
 *   DEMO_USER_NAME              Nome do lojista demo        (default: "Loja Demo VBA")
 *   DEMO_USER_EMAIL             E-mail de login no BaaS      (default: "demo@vbabaas.com.br")
 *   DEMO_USER_PASSWORD          Senha de login no BaaS       (default: "Demo@12345")
 *
 * Para a conta demo já sair CONECTADA ao gateway (recomendado pra entrega),
 * informe também as credenciais que você já recebeu por e-mail ao se cadastrar
 * de verdade no sandbox Lera Box:
 *   DEMO_GATEWAY_PERSON_TYPE    PF ou PJ
 *   DEMO_GATEWAY_DOCUMENT       CPF/CNPJ usado no cadastro do gateway
 *   DEMO_GATEWAY_PASSWORD       Senha que o gateway enviou por e-mail
 *   DEMO_GATEWAY_EMAIL          E-mail usado no cadastro do gateway
 *   DEMO_GATEWAY_PHONE          Telefone usado no cadastro do gateway
 *
 * Sem essas 5 variáveis, o script cria só o usuário do BaaS — o avaliador
 * loga normalmente e faz o próprio cadastro/login no gateway pela UI.
 */
async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const usersService = app.get(UsersService);
    const gatewayAuthService = app.get(GatewayAuthService);
    const gatewayAccountsRepo = app.get<Repository<GatewayAccount>>(
      getRepositoryToken(GatewayAccount),
    );

    const demoName = process.env.DEMO_USER_NAME ?? 'Loja Demo VBA';
    const demoEmail = process.env.DEMO_USER_EMAIL ?? 'demo@vbabaas.com.br';
    const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'Demo@12345';

    let user = await usersService.findByEmail(demoEmail);
    if (user) {
      console.log(`[seed] Usuário demo já existe (${demoEmail}), reaproveitando.`);
    } else {
      user = await usersService.create({ name: demoName, email: demoEmail, password: demoPassword });
      console.log(`[seed] Usuário demo criado: ${demoEmail}`);
    }

    const gatewayDocument = process.env.DEMO_GATEWAY_DOCUMENT;
    const gatewayPassword = process.env.DEMO_GATEWAY_PASSWORD;
    const gatewayEmail = process.env.DEMO_GATEWAY_EMAIL;
    const gatewayPhone = process.env.DEMO_GATEWAY_PHONE;
    const gatewayPersonType = process.env.DEMO_GATEWAY_PERSON_TYPE as GatewayPersonType | undefined;

    const hasGatewayCreds =
      gatewayDocument && gatewayPassword && gatewayEmail && gatewayPhone && gatewayPersonType;

    if (!hasGatewayCreds) {
      console.log(
        '[seed] Nenhuma credencial de gateway informada (DEMO_GATEWAY_*) — usuário demo criado ' +
          'sem conta no gateway vinculada. O avaliador pode cadastrar/logar pela UI normalmente.',
      );
      return;
    }

    // Garante que a linha de gateway_accounts já existe, com os dados de cadastro,
    // sem chamar o cadastro público de novo no gateway (a conta já existe lá).
    let account = await gatewayAccountsRepo.findOne({ where: { userId: user.id } });
    if (!account) {
      account = gatewayAccountsRepo.create({ userId: user.id });
    }
    account.personType = gatewayPersonType;
    account.document = gatewayDocument!;
    account.gatewayEmail = gatewayEmail!;
    account.phone = gatewayPhone!;
    account.isRegistered = true;
    await gatewayAccountsRepo.save(account);

    try {
      await gatewayAuthService.loginOnGateway(user.id, {
        document: gatewayDocument!,
        password: gatewayPassword!,
      });
      console.log('[seed] Conta demo conectada e autenticada no gateway Lera Box com sucesso.');
    } catch (err) {
      console.warn(
        '[seed] Não consegui autenticar no gateway agora (rede indisponível ou credenciais ' +
          'incorretas). O usuário demo do BaaS foi criado normalmente; o login no gateway pode ' +
          'ser refeito depois pela UI ou rodando o seed novamente.',
      );
      console.warn(`[seed] Detalhe: ${(err as Error).message}`);
    }

    console.log('');
    console.log('====================================================');
    console.log(' Credenciais de demonstração (login no BaaS):');
    console.log(`   E-mail: ${demoEmail}`);
    console.log(`   Senha:  ${demoPassword}`);
    console.log('====================================================');
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('[seed] Falhou:', err);
  process.exit(1);
});
