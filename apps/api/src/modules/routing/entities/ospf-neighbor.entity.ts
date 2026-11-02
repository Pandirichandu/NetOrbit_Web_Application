import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OspfProcess } from './ospf-process.entity';
import { OspfNeighborState } from '@netorbit/shared-types';

@Entity('ospf_neighbors')
export class OspfNeighbor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'process_id', type: 'uuid' })
  @Index()
  processId: string;

  @ManyToOne(() => OspfProcess, (proc) => proc.neighbors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_id' })
  process: OspfProcess;

  @Column({ name: 'neighbor_id', type: 'varchar', length: 45 })
  neighborId: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'interface_name', type: 'varchar', length: 100 })
  interfaceName: string;

  @Column({ type: 'varchar', length: 30, default: OspfNeighborState.FULL })
  state: OspfNeighborState;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ name: 'dead_time_seconds', type: 'int', default: 35 })
  deadTimeSeconds: number;
}
