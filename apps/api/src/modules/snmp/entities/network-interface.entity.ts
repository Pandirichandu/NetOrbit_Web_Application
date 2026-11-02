import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SnmpDevice } from './snmp-device.entity';
import { InterfaceAdminStatus, InterfaceOperStatus } from '@netorbit/shared-types';

@Entity('network_interfaces')
@Index(['deviceId', 'ifIndex'], { unique: true })
export class NetworkInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', type: 'uuid' })
  @Index()
  deviceId: string;

  @ManyToOne(() => SnmpDevice, (device) => device.interfaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: SnmpDevice;

  @Column({ name: 'if_index', type: 'int' })
  ifIndex: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alias?: string | null;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress?: string | null;

  @Column({ name: 'admin_status', type: 'varchar', length: 20, default: InterfaceAdminStatus.UP })
  adminStatus: InterfaceAdminStatus;

  @Column({ name: 'oper_status', type: 'varchar', length: 20, default: InterfaceOperStatus.UP })
  operStatus: InterfaceOperStatus;

  @Column({ name: 'speed_bps', type: 'bigint', default: 1000000000 }) // 1 Gbps default
  speedBps: number;

  @Column({ name: 'in_octets', type: 'bigint', default: 0 })
  inOctets: number;

  @Column({ name: 'out_octets', type: 'bigint', default: 0 })
  outOctets: number;

  @Column({ name: 'in_errors', type: 'bigint', default: 0 })
  inErrors: number;

  @Column({ name: 'out_errors', type: 'bigint', default: 0 })
  outErrors: number;

  @Column({ name: 'last_polled_at', type: 'timestamp with time zone', nullable: true })
  lastPolledAt?: Date | null;
}
