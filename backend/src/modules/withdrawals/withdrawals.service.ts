import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayAuthService } from '../gateway/gateway-auth.service';
import { GatewayPersonType } from '../gateway/gateway-account.entity';
import { GatewayHttpService } from '../gateway/gateway-http.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { Withdrawal, WithdrawalStatus } from './entities/withdrawal.entity';

//Traduz o status que o gateway manda em varios formatos possivel pro enum interno
function mapGatewayWithdrawalStatus(status: string): WithdrawalStatus {
  const normalized = status?.toUpperCase().trim();
  switch (normalized) {
    case 'APPROVED':
    case 'PAID':
    case 'SUCCESS':
      return WithdrawalStatus.APPROVED;
    case 'DENIED':
    case 'FAILED':
    case 'REJECTED':
      return WithdrawalStatus.DENIED;
    case 'CANCELLED':
    case 'CANCELED':
      return WithdrawalStatus.CANCELLED;
    default:
      return WithdrawalStatus.PENDING;
  }
}

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    private readonly gatewayAuth: GatewayAuthService,
    private readonly gatewayHttp: GatewayHttpService,
    private readonly transactionsService: TransactionsService,
  ) {}

  // cria o saque: valida a chave pix, confere saldo e manda pro gateway.
  // O gateway real rejeita "destinationAccount" (não existe suporte a saque
  // pra conta bancária no contrato dele, mesmo o PDF do desafio mencionando
  // essa possibilidade em texto) e exige pixKey sempre.
  async create(userId: string, dto: CreateWithdrawalDto) {
    if (!dto.pixKey) {
      throw new BadRequestException('Informe a chave Pix de destino para o saque.');
    }

    const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
    const account = await this.gatewayAuth.findAccountByUserId(userId);
    if (!account?.document) {
      throw new NotFoundException(
        'Documento do lojista não encontrado. Refaça o cadastro/login no gateway.',
      );
    }

    // O endpoint de saque do gateway só aceita CPF (11 dígitos) no campo "document",
    // mesmo quando a conta cadastrada é Pessoa Jurídica (CNPJ). Nesse caso, pedimos o
    // CPF do responsável separadamente em vez de mandar o CNPJ da conta e tomar 400
    // do gateway (que hoje aparecia pro lojista como um 502 genérico).
    let gatewayDocument = account.document;
    if (account.personType === GatewayPersonType.PJ) {
      if (!dto.requesterDocument) {
        throw new BadRequestException(
          'Sua conta no gateway é Pessoa Jurídica. Informe o CPF do responsável pelo saque ' +
            '(o gateway exige CPF de 11 dígitos nesse campo, não aceita CNPJ).',
        );
      }
      gatewayDocument = dto.requesterDocument;
    }

    // não confia só na validação do frontend: reconsulta o saldo atual no
    // gateway (GET /wallet) antes de pedir o saque, pra não deixar passar
    // um valor maior do que realmente tem disponível
    const wallet = await this.gatewayHttp.getWallet(accessToken);
    if (dto.amountCents > wallet.balanceCents) {
      throw new BadRequestException(
        `Saldo insuficiente para este saque. Saldo disponível: ${(wallet.balanceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      );
    }

    const withdrawal = this.withdrawalsRepo.create({
      userId,
      amountCents: dto.amountCents,
      pixKey: dto.pixKey,
      status: WithdrawalStatus.PENDING,
    });
    await this.withdrawalsRepo.save(withdrawal);

    const response = await this.gatewayHttp.createWithdrawal(accessToken, {
      amount: dto.amountCents,
      document: gatewayDocument,
      pixKey: dto.pixKey,
    });

    withdrawal.gatewayWithdrawalId = response.id;
    withdrawal.status = mapGatewayWithdrawalStatus(response.status);
    await this.withdrawalsRepo.save(withdrawal);
    await this.transactionsService.upsertFromWithdrawal(withdrawal, 'active_query');

    return withdrawal;
  }

  async getById(userId: string, id: string) {
    const withdrawal = await this.withdrawalsRepo.findOne({ where: { id, userId } });
    if (!withdrawal) throw new NotFoundException('Saque não encontrado');

    // consulta ativa no gateway pra pegar mudança de status que ainda não
    // chegou pelo webhook
    if (withdrawal.gatewayWithdrawalId) {
      try {
        const accessToken = await this.gatewayAuth.resolveAccessToken(userId);
        const remote = await this.gatewayHttp.getWithdrawal(
          accessToken,
          withdrawal.gatewayWithdrawalId,
        );
        const mapped = mapGatewayWithdrawalStatus(remote.status);
        if (mapped !== withdrawal.status) {
          withdrawal.status = mapped;
          await this.withdrawalsRepo.save(withdrawal);
          await this.transactionsService.upsertFromWithdrawal(withdrawal, 'active_query');
        }
      } catch {
        // se a consulta ativa falhar, devolve o último status que já tinha salvo
      }
    }

    return withdrawal;
  }

  async list(userId: string) {
    return this.withdrawalsRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findByGatewayId(gatewayWithdrawalId: string): Promise<Withdrawal | null> {
    return this.withdrawalsRepo.findOne({ where: { gatewayWithdrawalId } });
  }

  async save(withdrawal: Withdrawal): Promise<Withdrawal> {
    return this.withdrawalsRepo.save(withdrawal);
  }
}

export { mapGatewayWithdrawalStatus };
