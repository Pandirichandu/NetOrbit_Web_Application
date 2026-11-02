import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';

export enum RadiusAuthMethod {
  PAP = 'PAP',
  CHAP = 'CHAP',
  MSCHAPV2 = 'MSCHAPv2',
  EAP = 'EAP',
}

export enum RadiusAccountStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

@Entity('radius_users')
@Index(['tenantId'])
@Index(['tenantId', 'username'], { unique: true })
@Index(['subscriberId'])
@Index(['tenantId', 'status'])
export class RadiusUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  subscriberId: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: Subscriber | null;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'cleartext_password', type: 'varchar', length: 255, nullable: true })
  cleartextPassword: string | null;

  @Column({
    name: 'auth_type',
    type: 'varchar',
    length: 50,
    default: RadiusAuthMethod.PAP,
  })
  authType: RadiusAuthMethod;

  @Column({
    type: 'varchar',
    length: 50,
    default: RadiusAccountStatus.ACTIVE,
  })
  status: RadiusAccountStatus;

  @Column({ name: 'simultaneous_use', type: 'int', default: 1 })
  simultaneousUse: number;

  @Column({ name: 'framed_ip_address', type: 'varchar', length: 50, nullable: true })
  framedIpAddress: string | null;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress: string | null;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'custom_attributes', type: 'jsonb', default: () => "'{}'" })
  customAttributes: Record<string, string>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
