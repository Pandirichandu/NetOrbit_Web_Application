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
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { Lead } from './lead.entity';
import { Technician } from './technician.entity';
import { InstallationStatus } from '@netorbit/shared-types';

@Entity('installations')
export class Installation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'customer_name', type: 'varchar', length: 150 })
  customerName: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50 })
  contactPhone: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'scheduled_date', type: 'timestamp with time zone' })
  @Index()
  scheduledDate: Date;

  @Column({ type: 'varchar', length: 50, default: InstallationStatus.SCHEDULED })
  @Index()
  status: InstallationStatus;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId?: string | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead?: Lead | null;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  subscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber?: Subscriber | null;

  @Column({ name: 'technician_id', type: 'uuid', nullable: true })
  @Index()
  technicianId?: string | null;

  @ManyToOne(() => Technician, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'technician_id' })
  technician?: Technician | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
