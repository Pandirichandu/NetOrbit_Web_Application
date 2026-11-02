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
import { SnmpDevice } from './snmp-device.entity';
import { NetworkInterface } from './network-interface.entity';
import { TopologyLinkType } from '@netorbit/shared-types';

@Entity('topology_links')
export class TopologyLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'source_device_id', type: 'uuid' })
  @Index()
  sourceDeviceId: string;

  @ManyToOne(() => SnmpDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_device_id' })
  sourceDevice: SnmpDevice;

  @Column({ name: 'source_interface_id', type: 'uuid', nullable: true })
  sourceInterfaceId?: string | null;

  @ManyToOne(() => NetworkInterface, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'source_interface_id' })
  sourceInterface?: NetworkInterface | null;

  @Column({ name: 'target_device_id', type: 'uuid' })
  @Index()
  targetDeviceId: string;

  @ManyToOne(() => SnmpDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_device_id' })
  targetDevice: SnmpDevice;

  @Column({ name: 'target_interface_id', type: 'uuid', nullable: true })
  targetInterfaceId?: string | null;

  @ManyToOne(() => NetworkInterface, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_interface_id' })
  targetInterface?: NetworkInterface | null;

  @Column({ name: 'link_type', type: 'varchar', length: 30, default: TopologyLinkType.LLDP })
  linkType: TopologyLinkType;

  @Column({ name: 'speed_bps', type: 'bigint', default: 1000000000 })
  speedBps: number;

  @Column({ type: 'varchar', length: 20, default: 'UP' })
  status: 'UP' | 'DOWN';

  @CreateDateColumn({ name: 'last_discovered_at' })
  lastDiscoveredAt: Date;
}
