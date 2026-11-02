import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { BgpPeerStatus } from '@netorbit/shared-types';

@Entity('bgp_peers')
@Index(['tenantId', 'peerIp'], { unique: true })
export class BgpPeer {
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

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'local_asn', type: 'bigint' })
  localAsn: number;

  @Column({ name: 'remote_asn', type: 'bigint' })
  remoteAsn: number;

  @Column({ name: 'peer_ip', type: 'varchar', length: 45 })
  peerIp: string;

  // MD5 auth secret (AES-256-GCM encrypted)
  @Column({ name: 'md5_secret', type: 'varchar', length: 255, nullable: true })
  md5Secret?: string | null;

  @Column({ type: 'varchar', length: 30, default: BgpPeerStatus.ESTABLISHED })
  @Index()
  status: BgpPeerStatus;

  @Column({ name: 'prefixes_received', type: 'int', default: 0 })
  prefixesReceived: number;

  @Column({ name: 'prefixes_advertised', type: 'int', default: 0 })
  prefixesAdvertised: number;

  @Column({ name: 'uptime_seconds', type: 'bigint', default: 0 })
  uptimeSeconds: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
