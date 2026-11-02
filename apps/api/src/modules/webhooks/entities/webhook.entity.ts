import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { WebhookEvent } from './webhook-event.entity';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'endpoint_url', type: 'text' })
  endpointUrl: string;

  @Column({ name: 'secret_key', type: 'varchar', length: 255 })
  secretKey: string;

  @Column({ name: 'subscribed_events', type: 'text', array: true, default: '{}' })
  subscribedEvents: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @OneToMany(() => WebhookEvent, (event) => event.webhook)
  events: WebhookEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
