import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { IpPool } from './ip-pool.entity';
import { IpAllocationStatus } from '@netorbit/shared-types';

export { IpAllocationStatus };

@Entity('ip_allocations')
@Index(['tenantId', 'poolId', 'ipAddress'], { unique: true })
export class IpAddressAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'pool_id', type: 'uuid' })
  @Index()
  poolId: string;

  @ManyToOne(() => IpPool, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pool_id' })
  pool: IpPool;

  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  @Index()
  ipAddress: string;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress?: string | null;

  @Column({ type: 'varchar', length: 50, default: IpAllocationStatus.ALLOCATED })
  status: IpAllocationStatus;

  @Column({ name: 'allocated_to_type', type: 'varchar', length: 50, default: 'subscriber' })
  @Index()
  allocatedToType: string;

  @Column({ name: 'allocated_to_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  allocatedToId?: string | null;

  @Column({ name: 'reserved_reason', type: 'text', nullable: true })
  reservedReason?: string | null;

  @CreateDateColumn({ name: 'allocated_at' })
  allocatedAt: Date;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt?: Date | null;
}
