import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { LeadStatus } from '@netorbit/shared-types';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'interested_package', type: 'varchar', length: 100, nullable: true })
  interestedPackage?: string | null;

  @Column({ type: 'varchar', length: 50, default: LeadStatus.NEW })
  @Index()
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'converted_subscriber_id', type: 'uuid', nullable: true })
  @Index()
  convertedSubscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'converted_subscriber_id' })
  convertedSubscriber?: Subscriber | null;

  @Column({ name: 'converted_at', type: 'timestamp with time zone', nullable: true })
  convertedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
