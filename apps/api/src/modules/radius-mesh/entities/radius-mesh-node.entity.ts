import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RadiusMeshEvent } from './radius-mesh-event.entity';
import {
  RadiusMeshNodeStatus,
  RadiusMeshNodeRole,
} from '@netorbit/shared-types';

@Entity('radius_mesh_nodes')
@Index(['tenantId', 'nodeId'], { unique: true })
export class RadiusMeshNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'node_id', type: 'varchar', length: 100 })
  nodeId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  region: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'auth_port', type: 'int', default: 1812 })
  authPort: number;

  @Column({ name: 'acct_port', type: 'int', default: 1813 })
  acctPort: number;

  @Column({ name: 'coa_port', type: 'int', default: 3799 })
  coaPort: number;

  // Shared secret for node-to-node proxy mesh authentication (AES-256-GCM encrypted)
  @Column({ name: 'shared_secret', type: 'varchar', length: 255 })
  sharedSecret: string;

  @Column({ type: 'varchar', length: 30, default: RadiusMeshNodeStatus.ONLINE })
  @Index()
  status: RadiusMeshNodeStatus;

  @Column({ type: 'varchar', length: 30, default: RadiusMeshNodeRole.PRIMARY })
  role: RadiusMeshNodeRole;

  @Column({ type: 'int', default: 10 })
  priority: number;

  @Column({ name: 'latency_ms', type: 'int', default: 15 })
  latencyMs: number;

  @Column({ name: 'load_factor', type: 'numeric', precision: 5, scale: 2, default: 0.15 })
  loadFactor: number;

  @Column({ name: 'active_sessions_count', type: 'int', default: 0 })
  activeSessionsCount: number;

  @Column({ name: 'last_heartbeat_at', type: 'timestamp with time zone', nullable: true })
  lastHeartbeatAt?: Date | null;

  @OneToMany(() => RadiusMeshEvent, (event) => event.node)
  events: RadiusMeshEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
