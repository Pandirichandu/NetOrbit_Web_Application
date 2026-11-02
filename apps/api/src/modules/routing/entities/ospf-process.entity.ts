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
import { OspfNeighbor } from './ospf-neighbor.entity';

@Entity('ospf_processes')
@Index(['tenantId', 'processId'], { unique: true })
export class OspfProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  @Index()
  deviceId?: string | null;

  @Column({ name: 'process_id', type: 'int', default: 1 })
  processId: number;

  @Column({ name: 'router_id', type: 'varchar', length: 45 })
  routerId: string;

  @Column({ name: 'area_id', type: 'varchar', length: 45, default: '0.0.0.0' })
  areaId: string;

  @Column({ name: 'auth_type', type: 'varchar', length: 20, default: 'NONE' })
  authType: 'NONE' | 'SIMPLE' | 'MD5';

  @Column({ type: 'varchar', length: 30, default: 'RUNNING' })
  status: 'RUNNING' | 'STOPPED' | 'ERROR';

  @Column({ name: 'interfaces_count', type: 'int', default: 0 })
  interfacesCount: number;

  @OneToMany(() => OspfNeighbor, (n) => n.process, { cascade: true })
  neighbors: OspfNeighbor[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
