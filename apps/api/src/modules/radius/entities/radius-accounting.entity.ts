import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { RadiusUser } from './radius-user.entity';
import { NasDevice } from '../../nas/entities/nas-device.entity';

export enum RadiusAccountingStatusType {
  START = 'Start',
  INTERIM_UPDATE = 'Interim-Update',
  STOP = 'Stop',
  ACCOUNTING_ON = 'Accounting-On',
  ACCOUNTING_OFF = 'Accounting-Off',
}

@Entity('radius_accounting')
@Index(['tenantId', 'acctSessionId'])
@Index(['tenantId', 'username'])
@Index(['tenantId', 'acctStatusType'])
@Index(['startTime'])
@Index(['stopTime'])
export class RadiusAccounting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'radius_user_id', type: 'uuid', nullable: true })
  radiusUserId: string | null;

  @ManyToOne(() => RadiusUser, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'radius_user_id' })
  radiusUser: RadiusUser | null;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  subscriberId: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: Subscriber | null;

  @Column({ name: 'nas_id', type: 'uuid', nullable: true })
  nasId: string | null;

  @ManyToOne(() => NasDevice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'nas_id' })
  nas: NasDevice | null;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'acct_session_id', type: 'varchar', length: 150 })
  acctSessionId: string;

  @Column({ name: 'acct_unique_id', type: 'varchar', length: 150 })
  acctUniqueId: string;

  @Column({ name: 'nas_ip_address', type: 'varchar', length: 50 })
  nasIpAddress: string;

  @Column({ name: 'nas_port', type: 'int', nullable: true })
  nasPort: number | null;

  @Column({ name: 'framed_ip_address', type: 'varchar', length: 50, nullable: true })
  framedIpAddress: string | null;

  @Column({ name: 'calling_station_id', type: 'varchar', length: 50, nullable: true })
  callingStationId: string | null;

  @Column({ name: 'called_station_id', type: 'varchar', length: 50, nullable: true })
  calledStationId: string | null;

  @Column({
    name: 'acct_status_type',
    type: 'varchar',
    length: 50,
  })
  acctStatusType: RadiusAccountingStatusType;

  @Column({ name: 'acct_session_time', type: 'int', default: 0 })
  acctSessionTime: number;

  @Column({ name: 'bytes_in', type: 'bigint', default: 0 })
  bytesIn: string; // TypeORM maps bigint to string in JS to avoid precision loss

  @Column({ name: 'bytes_out', type: 'bigint', default: 0 })
  bytesOut: string;

  @Column({ name: 'acct_input_gigawords', type: 'int', default: 0 })
  acctInputGigawords: number;

  @Column({ name: 'acct_output_gigawords', type: 'int', default: 0 })
  acctOutputGigawords: number;

  @Column({ name: 'terminate_cause', type: 'varchar', length: 100, nullable: true })
  terminateCause: string | null;

  @Column({ name: 'start_time', type: 'timestamp', default: () => 'now()' })
  startTime: Date;

  @Column({ name: 'stop_time', type: 'timestamp', nullable: true })
  stopTime: Date | null;

  @Column({ name: 'last_update', type: 'timestamp', default: () => 'now()' })
  lastUpdate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
