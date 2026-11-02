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
  OneToOne,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Package } from '../../packages/entities/package.entity';

export enum SubscriberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum IpAssignmentType {
  DYNAMIC = 'dynamic',
  STATIC = 'static',
  PPPOE = 'pppoe',
  DHCP = 'dhcp',
}

@Entity('subscribers')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'accountNumber'], { unique: true })
@Index(['tenantId', 'username'], { unique: true })
@Index(['tenantId', 'email'])
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'account_number', type: 'varchar', length: 50 })
  accountNumber: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @OneToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 30, nullable: true })
  alternatePhone: string | null;

  @Column({ name: 'company_name', type: 'varchar', length: 150, nullable: true })
  companyName: string | null;

  @Column({ name: 'national_id', type: 'varchar', length: 50, nullable: true })
  nationalId: string | null;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20 })
  postalCode: string;

  @Column({ type: 'varchar', length: 100, default: 'US' })
  country: string;

  @Column({ name: 'gps_coordinates', type: 'varchar', length: 100, nullable: true })
  gpsCoordinates: string | null;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId: string | null;

  @ManyToOne(() => Package, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Package | null;

  @Column({
    name: 'ip_assignment_type',
    type: 'varchar',
    length: 50,
    default: IpAssignmentType.DYNAMIC,
  })
  ipAssignmentType: IpAssignmentType;

  @Column({ name: 'static_ip', type: 'varchar', length: 50, nullable: true })
  staticIp: string | null;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress: string | null;

  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: SubscriberStatus.PENDING,
  })
  status: SubscriberStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'installation_date', type: 'timestamp', nullable: true })
  installationDate: Date | null;

  @Column({ name: 'auto_renew', type: 'boolean', default: true })
  autoRenew: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
