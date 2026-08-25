import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus, PaymentMethod } from '../../../common/enums/order-status.enum';

/* Pedido: um espelho local de uma tentativa de pagamento no gateway pra dar pra conciliar
o status só é atualizado de forma confiável via webhook (nunca apartir do frontend) */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'checkout_link_id' })
  checkoutLinkId: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  // referencia unica mandada pro gateway como externalReference
  @Index({ unique: true })
  @Column({ name: 'external_reference' })
  externalReference: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'fee_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  feePercent?: string;

  @Column({ type: 'int', nullable: true })
  installments?: number;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'gateway_payment_id', nullable: true })
  gatewayPaymentId?: string;

  @Column({ name: 'gateway_txid', nullable: true })
  gatewayTxid?: string;

  @Column({ name: 'pix_qr_code_base64', type: 'text', nullable: true })
  pixQrCodeBase64?: string;

  @Column({ name: 'pix_emv', type: 'text', nullable: true })
  pixEmv?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
