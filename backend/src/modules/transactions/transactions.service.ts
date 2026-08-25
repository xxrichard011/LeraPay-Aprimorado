import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { Transaction, TransactionType } from './entities/transaction.entity';

// Formato minimo aceito de um Order/Withdrawal
interface OrderLike {
  id: string;
  userId: string;
  method: 'PIX' | 'CARD';
  externalReference: string;
  gatewayPaymentId?: string;
  status: string;
  amountCents: number;
  feePercent?: string;
}

interface WithdrawalLike {
  id: string;
  userId: string;
  gatewayWithdrawalId?: string;
  status: string;
  amountCents: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  // calcula o valor liquido descontando a taxa (se não tiver taxa, valor liquido = valor cheio)
  private netAmount(amountCents: number, feePercent?: string | null): number {
    const fee = feePercent ? Number(feePercent) : 0;
    return fee ? Math.round(amountCents * (1 - fee / 100)) : amountCents;
  }

  private isDuplicateKeyError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const code = (err as any).driverError?.code ?? (err as any).code;
    return code === 'ER_DUP_ENTRY' || code === '23505';
  }

  // Cria ou atualiza o espelho de um Order (pix/cartão)
  async upsertFromOrder(
    order: OrderLike,
    source: Transaction['source'] = 'local',
  ): Promise<Transaction> {
    let tx = await this.repo.findOne({ where: { orderId: order.id } });
    if (!tx) {
      tx = this.repo.create({ orderId: order.id });
    }

    tx.userId = order.userId;
    tx.type = order.method === 'PIX' ? TransactionType.PIX : TransactionType.CARD;
    tx.externalReference = order.externalReference;
    tx.gatewayTransactionId = order.gatewayPaymentId;
    tx.status = order.status;
    tx.amountCents = order.amountCents;
    tx.feePercent = order.feePercent;
    tx.netAmountCents = this.netAmount(order.amountCents, order.feePercent);
    tx.source = source;

    try {
      return await this.repo.save(tx);
    } catch (err) {
      // dois webhooks pro mesmo pedido chegaram juntos e o insert concorrente já criou a linha
      if (!tx.id && this.isDuplicateKeyError(err)) {
        const existing = await this.repo.findOneOrFail({ where: { orderId: order.id } });
        return this.repo.save({ ...existing, ...tx, id: existing.id });
      }
      throw err;
    }
  }

  // mesma coisa mas pro espelho de um Withdrawal 
  async upsertFromWithdrawal(
    withdrawal: WithdrawalLike,
    source: Transaction['source'] = 'local',
  ): Promise<Transaction> {
    let tx = await this.repo.findOne({ where: { withdrawalId: withdrawal.id } });
    if (!tx) {
      tx = this.repo.create({ withdrawalId: withdrawal.id });
    }

    tx.userId = withdrawal.userId;
    tx.type = TransactionType.WITHDRAWAL;
    tx.gatewayTransactionId = withdrawal.gatewayWithdrawalId;
    tx.status = withdrawal.status;
    tx.amountCents = withdrawal.amountCents;
    tx.feePercent = undefined;
    tx.netAmountCents = withdrawal.amountCents;
    tx.source = source;

    try {
      return await this.repo.save(tx);
    } catch (err) {
      if (!tx.id && this.isDuplicateKeyError(err)) {
        const existing = await this.repo.findOneOrFail({ where: { withdrawalId: withdrawal.id } });
        return this.repo.save({ ...existing, ...tx, id: existing.id });
      }
      throw err;
    }
  }

  // Listagem local serve de fallback quando o gateway cai.
  async list(userId: string, query: ListTransactionsQueryDto): Promise<Transaction[]> {
    return this.repo
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .andWhere(query.status ? 'tx.status = :status' : '1=1', { status: query.status })
      .andWhere(query.type ? 'tx.type = :type' : '1=1', { type: query.type })
      .orderBy('tx.updatedAt', 'DESC')
      .take(query.limit ?? 50)
      .getMany();
  }
}

