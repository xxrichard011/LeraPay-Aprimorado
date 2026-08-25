import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionType {
  PIX = 'PIX',
  CARD = 'CARD',
  WITHDRAWAL = 'WITHDRAWAL',
}

// Espelho local de conciliação
/* Diferente do webhook_events, essa tabela guarda um registro só por order/withdrawal, sempre atualizado com o 
último status conhecido, é tipo o "estado atual" que continua valendo mesmo se o gateway cair */

// É alimentada em 3 lugares: CheckoutService (criar/atualizar Order) -  WebhooksService (PAYMENT_PIX/PAYMENT_CARD/WITHDRAWAL) e WithdrawalsService (criar saque e consultar status)

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Index({ unique: true })
  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Index({ unique: true })
  @Column({ name: 'withdrawal_id', nullable: true })
  withdrawalId?: string;

  // mesmo externalReference usado pra conciliar com o gateway
  @Index()
  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  // gatewayPaymentId (pix/cartão) ou gatewayWithdrawalId (saque)
  @Column({ name: 'gateway_transaction_id', nullable: true })
  gatewayTransactionId?: string;

  @Index()
  @Column()
  status: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'fee_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  feePercent?: string;

  //Valor liquido depois de descontar a taxa (cartão)
  @Column({ name: 'net_amount_cents', type: 'int' })
  netAmountCents: number;

  @Column({ default: 'local' })
  source: 'webhook' | 'active_query' | 'local';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
