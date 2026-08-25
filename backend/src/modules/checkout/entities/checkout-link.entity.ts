import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../../../common/enums/order-status.enum';

export enum CheckoutLinkStatus {
  OPEN = 'OPEN', // aguardando pagamento (aguardando QR ser pago ou cartão ser enviado)
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  DENIED = 'DENIED',
}

/* sessão de checkout que o user cria. tem id próprio, tipo que é
   usado como externalReference nas chamadas pro gateway, */
@Entity('checkout_links')
export class CheckoutLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CheckoutLinkStatus, default: CheckoutLinkStatus.OPEN })
  status: CheckoutLinkStatus;

  // taxa e parcelas para utilizar no cartão
  @Column({ name: 'fee_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  feePercent?: string;

  @Column({ type: 'int', nullable: true })
  installments?: number;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
