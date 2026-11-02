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
import { DhcpScope } from './dhcp-scope.entity';
import { DhcpLeaseStatus } from '@netorbit/shared-types';

export { DhcpLeaseStatus };

@Entity('dhcp_leases')
@Index(['tenantId', 'scopeId', 'ipAddress'], { unique: true })
export class DhcpLease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'scope_id', type: 'uuid' })
  @Index()
  scopeId: string;

  @ManyToOne(() => DhcpScope, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scope_id' })
  scope: DhcpScope;

  @Column({ name: 'ip_address', type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ name: 'mac_address', type: 'varchar', length: 50 })
  @Index()
  macAddress: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  hostname?: string | null;

  @Column({ name: 'is_static', type: 'boolean', default: false })
  isStatic: boolean;

  @Column({ type: 'varchar', length: 50, default: DhcpLeaseStatus.ACTIVE })
  @Index()
  status: DhcpLeaseStatus;

  @CreateDateColumn({ name: 'starts_at' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
