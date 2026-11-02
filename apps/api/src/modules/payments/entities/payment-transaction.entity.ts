import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { Invoice } from '../../billing/entities/invoice.entity';
import { PaymentGateway, PaymentStatus } from '@netorbit/shared-types';

export { PaymentGateway, PaymentStatus };

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  @Index()
  invoiceId?: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice | null;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  @Index()
  subscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber?: Subscriber | null;

  @Column({ type: 'varchar', length: 50 })
  gateway: PaymentGateway;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  gatewayTransactionId?: string | null;

  @Column({ name: 'gateway_order_id', type: 'varchar', length: 255, nullable: true })
  gatewayOrderId?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 50, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', default: () => "'{}'" })
  gatewayResponse: Record<string, any>;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  @Index()
  idempotencyKey?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
