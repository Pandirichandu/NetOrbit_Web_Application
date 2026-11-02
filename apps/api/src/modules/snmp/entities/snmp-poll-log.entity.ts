import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SnmpDevice } from './snmp-device.entity';
import { NetworkDeviceStatus } from '@netorbit/shared-types';

@Entity('snmp_poll_logs')
export class SnmpPollLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', type: 'uuid' })
  @Index()
  deviceId: string;

  @ManyToOne(() => SnmpDevice, (device) => device.pollLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: SnmpDevice;

  @Column({ name: 'response_time_ms', type: 'int', default: 0 })
  responseTimeMs: number;

  @Column({ type: 'varchar', length: 30, default: NetworkDeviceStatus.ONLINE })
  status: NetworkDeviceStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'metrics_snapshot', type: 'jsonb', nullable: true })
  metricsSnapshot?: Record<string, any> | null;

  @CreateDateColumn({ name: 'polled_at' })
  @Index()
  polledAt: Date;
}
