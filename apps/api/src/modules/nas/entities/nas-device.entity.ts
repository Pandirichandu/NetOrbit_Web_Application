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

export enum NasVendorType {
  MIKROTIK = 'mikrotik',
  CISCO = 'cisco',
  UBIQUITI = 'ubiquiti',
  GENERIC = 'generic',
}

export enum NasDeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNREACHABLE = 'unreachable',
}

@Entity('nas_devices')
@Index(['tenantId'])
@Index(['tenantId', 'ipAddress'])
@Index(['tenantId', 'name'])
@Index(['tenantId', 'status'])
export class NasDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  identifier: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255 })
  secret: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: NasVendorType.MIKROTIK,
  })
  type: NasVendorType;

  @Column({ name: 'nas_type', type: 'varchar', length: 50, default: 'other' })
  nasType: string;

  @Column({ type: 'int', default: 1812 })
  port: number;

  @Column({ name: 'coa_port', type: 'int', default: 3799 })
  coaPort: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: NasDeviceStatus.ACTIVE,
  })
  status: NasDeviceStatus;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
