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
import { RoutingProtocol } from '@netorbit/shared-types';

@Entity('routing_config_revisions')
export class RoutingConfigRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'device_id', type: 'uuid' })
  @Index()
  deviceId: string;

  @Column({ type: 'varchar', length: 20 })
  protocol: RoutingProtocol;

  @Column({ name: 'raw_config', type: 'text' })
  rawConfig: string;

  @Column({ name: 'applied_diff', type: 'text', nullable: true })
  appliedDiff?: string | null;

  @Column({ name: 'deployed_by', type: 'varchar', length: 150 })
  deployedBy: string;

  @CreateDateColumn({ name: 'deployed_at' })
  deployedAt: Date;

  @Column({ name: 'rollback_target_id', type: 'uuid', nullable: true })
  rollbackTargetId?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'APPLIED' })
  status: 'PENDING' | 'APPLIED' | 'FAILED' | 'ROLLED_BACK';
}
