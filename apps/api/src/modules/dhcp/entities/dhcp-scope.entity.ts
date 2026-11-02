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
import { IpPool } from '../../ipam/entities/ip-pool.entity';
import { DhcpScopeStatus } from '@netorbit/shared-types';

export { DhcpScopeStatus };

@Entity('dhcp_scopes')
@Index(['tenantId', 'name'], { unique: true })
export class DhcpScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'pool_id', type: 'uuid', nullable: true })
  poolId?: string | null;

  @ManyToOne(() => IpPool, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pool_id' })
  pool?: IpPool | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'interface_name', type: 'varchar', length: 100, default: 'ether2-lan' })
  interfaceName: string;

  @Column({ name: 'lease_time_seconds', type: 'int', default: 86400 })
  leaseTimeSeconds: number;

  @Column({ name: 'domain_name', type: 'varchar', length: 150, default: 'lan.netorbit.local' })
  domainName: string;

  @Column({ name: 'dns_servers', type: 'varchar', length: 255, default: '8.8.8.8, 1.1.1.1' })
  dnsServers: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gateway?: string | null;

  @Column({ name: 'subnet_mask', type: 'varchar', length: 50, default: '255.255.255.0' })
  subnetMask: string;

  @Column({ type: 'varchar', length: 50, default: DhcpScopeStatus.ACTIVE })
  status: DhcpScopeStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
