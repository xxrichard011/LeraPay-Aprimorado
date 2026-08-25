import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// registro de auditoria de cada webhook que chega do gateway
@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type' })
  eventType: string;

  // payload.id do gateway quando tem, se nao hash do corpo que chegou
  @Index({ unique: true })
  @Column({ name: 'dedupe_key' })
  dedupeKey: string;

  @Column({ name: 'raw_payload', type: 'text' })
  rawPayload: string;

  @Column({ name: 'signature_valid', default: false })
  signatureValid: boolean;

  @Column({ default: 'RECEIVED' })
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError?: string | null;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
