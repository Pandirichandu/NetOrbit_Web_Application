import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Webhook } from './webhook.entity';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'webhook_id', type: 'uuid' })
  @Index()
  webhookId: string;

  @ManyToOne(() => Webhook, (webhook) => webhook.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index()
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'response_code', type: 'int', nullable: true })
  responseCode?: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody?: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number | null;

  @Column({ name: 'is_success', type: 'boolean', default: true })
  @Index()
  isSuccess: boolean;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'delivered_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  deliveredAt: Date;
}
