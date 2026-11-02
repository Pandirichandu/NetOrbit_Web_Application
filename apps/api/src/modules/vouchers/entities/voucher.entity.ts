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
import { Package } from '../../packages/entities/package.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { VoucherStatus } from '@netorbit/shared-types';

export { VoucherStatus };

@Entity('vouchers')
@Index(['tenantId', 'code'], { unique: true })
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pin?: string | null;

  @Column({ name: 'batch_number', type: 'varchar', length: 100, nullable: true })
  @Index()
  batchNumber?: string | null;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId?: string | null;

  @ManyToOne(() => Package, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'package_id' })
  package?: Package | null;

  @Column({ name: 'duration_minutes', type: 'int', default: 1440 })
  durationMinutes: number;

  @Column({ name: 'data_quota_mb', type: 'bigint', nullable: true })
  dataQuotaMb?: number | null;

  @Column({ type: 'varchar', length: 50, default: VoucherStatus.ACTIVE })
  @Index()
  status: VoucherStatus;

  @Column({ name: 'redeemed_by_subscriber_id', type: 'uuid', nullable: true })
  redeemedBySubscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'redeemed_by_subscriber_id' })
  redeemedBySubscriber?: Subscriber | null;

  @Column({ name: 'redeemed_by_mac', type: 'varchar', length: 50, nullable: true })
  redeemedByMac?: string | null;

  @Column({ name: 'redeemed_at', type: 'timestamp', nullable: true })
  redeemedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'max_uses', type: 'int', default: 1 })
  maxUses: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
