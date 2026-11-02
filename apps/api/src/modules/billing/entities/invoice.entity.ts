import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { BillingCycle } from '../../packages/entities/package.entity';
import { InvoiceStatus, InvoiceItem } from '@netorbit/shared-types';

export { InvoiceStatus };

@Entity('invoices')
@Index(['tenantId', 'invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  @Index()
  subscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber?: Subscriber | null;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 50, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column({ type: 'varchar', length: 50, default: InvoiceStatus.PENDING })
  @Index()
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  subtotal: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 18.00 })
  taxRate: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  taxAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  discountAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  paidAmount: number;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  balanceAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'issue_date', type: 'date', default: () => 'CURRENT_DATE' })
  issueDate: Date;

  @Column({ name: 'due_date', type: 'date' })
  @Index()
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: InvoiceItem[];

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
