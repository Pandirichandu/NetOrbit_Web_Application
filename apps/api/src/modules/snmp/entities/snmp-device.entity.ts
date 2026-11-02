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
import { NetworkInterface } from './network-interface.entity';
import { SnmpPollLog } from './snmp-poll-log.entity';
import { SnmpVersion, SnmpSecurityLevel, SnmpAuthProtocol, SnmpPrivProtocol, NetworkDeviceStatus } from '@netorbit/shared-types';

@Entity('snmp_devices')
@Index(['tenantId', 'ipAddress'], { unique: true })
export class SnmpDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  @Index()
  ipAddress: string;

  @Column({ type: 'int', default: 161 })
  port: number;

  @Column({ type: 'varchar', length: 20, default: SnmpVersion.V2C })
  version: SnmpVersion;

  // v2c community string (AES-256-GCM encrypted)
  @Column({ name: 'community_string', type: 'varchar', length: 255, nullable: true })
  communityString?: string | null;

  // v3 parameters
  @Column({ name: 'v3_user', type: 'varchar', length: 100, nullable: true })
  v3User?: string | null;

  @Column({ name: 'v3_security_level', type: 'varchar', length: 30, nullable: true })
  v3SecurityLevel?: SnmpSecurityLevel | null;

  @Column({ name: 'v3_auth_protocol', type: 'varchar', length: 20, nullable: true })
  v3AuthProtocol?: SnmpAuthProtocol | null;

  @Column({ name: 'v3_auth_key', type: 'varchar', length: 255, nullable: true })
  v3AuthKey?: string | null;

  @Column({ name: 'v3_priv_protocol', type: 'varchar', length: 20, nullable: true })
  v3PrivProtocol?: SnmpPrivProtocol | null;

  @Column({ name: 'v3_priv_key', type: 'varchar', length: 255, nullable: true })
  v3PrivKey?: string | null;

  @Column({ type: 'varchar', length: 100, default: 'Generic' })
  vendor: string;

  @Column({ type: 'varchar', length: 100, default: 'Network Device' })
  model: string;

  @Column({ name: 'sys_name', type: 'varchar', length: 255, nullable: true })
  sysName?: string | null;

  @Column({ name: 'sys_descr', type: 'text', nullable: true })
  sysDescr?: string | null;

  @Column({ name: 'sys_location', type: 'varchar', length: 255, nullable: true })
  sysLocation?: string | null;

  @Column({ name: 'uptime_seconds', type: 'bigint', default: 0 })
  uptimeSeconds: number;

  @Column({ type: 'varchar', length: 30, default: NetworkDeviceStatus.ONLINE })
  @Index()
  status: NetworkDeviceStatus;

  @Column({ name: 'polling_interval_seconds', type: 'int', default: 60 })
  pollingIntervalSeconds: number;

  @Column({ name: 'last_polled_at', type: 'timestamp with time zone', nullable: true })
  lastPolledAt?: Date | null;

  @OneToMany(() => NetworkInterface, (iface) => iface.device)
  interfaces: NetworkInterface[];

  @OneToMany(() => SnmpPollLog, (log) => log.device)
  pollLogs: SnmpPollLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
