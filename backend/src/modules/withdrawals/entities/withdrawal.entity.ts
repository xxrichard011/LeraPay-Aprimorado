import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  CANCELLED = 'CANCELLED',
}

// Espelho local de uma solicitação de saque no gateway, status definitivochega pelo webhook (evento WITHDRAWAL)
@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'pix_key', nullable: true })
  pixKey?: string;

  @Column({ name: 'destination_bank', nullable: true })
  destinationBank?: string;

  @Column({ name: 'destination_agency', nullable: true })
  destinationAgency?: string;

  @Column({ name: 'destination_account', nullable: true })
  destinationAccount?: string;

  @Index()
  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @Index({ unique: true })
  @Column({ name: 'gateway_withdrawal_id', nullable: true })
  gatewayWithdrawalId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
