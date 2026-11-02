import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RadiusMeshNode } from './radius-mesh-node.entity';

@Entity('radius_mesh_events')
export class RadiusMeshEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'node_id', type: 'uuid' })
  @Index()
  nodeId: string;

  @ManyToOne(() => RadiusMeshNode, (node) => node.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node: RadiusMeshNode;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  @Index()
  eventType: 'AUTH_FORWARD' | 'ACCT_FORWARD' | 'FAILOVER' | 'NODE_DOWN' | 'COA_ROUTED';

  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  sessionId?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  username?: string | null;

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
