import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum GatewayPersonType {
  PF = 'PF',
  PJ = 'PJ',
}

// Loga com a conta do user no gateway Lera Box.
// (passwordEncrypted) e (accessTokenEncrypted) não vão pro front
@Entity('gateway_accounts')
export class GatewayAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.gatewayAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: GatewayPersonType })
  personType: GatewayPersonType;

  @Column()
  document: string;

  @Column()
  gatewayEmail: string;

  @Column()
  phone: string;

  @Column({ name: 'codigo_cliente', nullable: true })
  codigoCliente?: string;

  @Column({ name: 'chave_loja', nullable: true })
  chaveLoja?: string;

  // Senha do gateway cifrada (só usada pra relogar automático)
  @Column({ name: 'password_encrypted', type: 'text', nullable: true })
  passwordEncrypted?: string;

  // bearer token atual do gateway cifrado
  @Column({ name: 'access_token_encrypted', type: 'text', nullable: true })
  accessTokenEncrypted?: string;

  @Column({ name: 'token_issued_at', type: 'datetime', nullable: true })
  tokenIssuedAt?: Date;

  @Column({ name: 'is_registered', default: false })
  isRegistered: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
