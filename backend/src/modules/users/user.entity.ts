import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GatewayAccount } from '../gateway/gateway-account.entity';

/* Usuario da aplicação Baas, é de propósito diferente do usuario cadastrado no gateway,
um user do BaaS tem no maximo uma conta vinculada no gateway accounts */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @OneToOne(() => GatewayAccount, (account) => account.user)
  gatewayAccount?: GatewayAccount;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
