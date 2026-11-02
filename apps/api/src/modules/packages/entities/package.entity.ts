import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum PackageType {
  BROADBAND = 'broadband',
  HOTSPOT = 'hotspot',
  DEDICATED = 'dedicated',
  FIBER = 'fiber',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  DAILY = 'daily',
  CUSTOM = 'custom',
}

@Entity('packages')
@Index(['tenantId', 'slug'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'type'])
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: PackageType.BROADBAND,
  })
  type: PackageType;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0.0 })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    name: 'billing_cycle',
    type: 'varchar',
    length: 50,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Column({ name: 'validity_days', type: 'int', default: 30 })
  validityDays: number;

  @Column({ name: 'download_speed_mbps', type: 'int', default: 50 })
  downloadSpeedMbps: number;

  @Column({ name: 'upload_speed_mbps', type: 'int', default: 25 })
  uploadSpeedMbps: number;

  @Column({ name: 'data_quota_gb', type: 'numeric', precision: 10, scale: 2, nullable: true })
  dataQuotaGb: number | null;

  @Column({ name: 'burst_speed_mbps', type: 'numeric', precision: 10, scale: 2, nullable: true })
  burstSpeedMbps: number | null;

  @Column({ name: 'speed_after_quota_mbps', type: 'numeric', precision: 10, scale: 2, nullable: true })
  speedAfterQuotaMbps: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  features: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
