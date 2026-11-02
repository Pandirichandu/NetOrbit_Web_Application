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
import { IpPoolType, IpVersion } from '@netorbit/shared-types';

export { IpPoolType, IpVersion };

@Entity('ip_pools')
@Index(['tenantId', 'name'], { unique: true })
export class IpPool {
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

  @Column({ type: 'varchar', length: 100 })
  subnet: string;

  @Column({ name: 'start_ip', type: 'varchar', length: 50 })
  startIp: string;

  @Column({ name: 'end_ip', type: 'varchar', length: 50 })
  endIp: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gateway?: string | null;

  @Column({ name: 'dns_servers', type: 'varchar', length: 255, nullable: true })
  dnsServers?: string | null;

  @Column({ type: 'varchar', length: 50, default: IpPoolType.DYNAMIC })
  @Index()
  type: IpPoolType;

  @Column({ name: 'ip_version', type: 'varchar', length: 10, default: IpVersion.IPV4 })
  ipVersion: IpVersion;

  @Column({ name: 'total_ips', type: 'int', default: 0 })
  totalIps: number;

  @Column({ name: 'allocated_ips', type: 'int', default: 0 })
  allocatedIps: number;

  @Column({ name: 'reserved_ips', type: 'int', default: 0 })
  reservedIps: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
