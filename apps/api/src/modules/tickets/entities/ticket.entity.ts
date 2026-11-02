import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subscriber } from '../../subscribers/entities/subscriber.entity';
import { User } from '../../users/entities/user.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketPriority, TicketCategory, TicketStatus } from '@netorbit/shared-types';

@Entity('tickets')
@Index(['tenantId', 'ticketNumber'], { unique: true })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'ticket_number', type: 'varchar', length: 100 })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: TicketCategory.TECHNICAL })
  @Index()
  category: TicketCategory;

  @Column({ type: 'varchar', length: 50, default: TicketPriority.MEDIUM })
  @Index()
  priority: TicketPriority;

  @Column({ type: 'varchar', length: 50, default: TicketStatus.OPEN })
  @Index()
  status: TicketStatus;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  @Index()
  subscriberId?: string | null;

  @ManyToOne(() => Subscriber, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber?: Subscriber | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  @Index()
  assignedToId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User | null;

  @Column({ name: 'sla_hours', type: 'int', default: 24 })
  slaHours: number;

  @Column({ name: 'sla_due_at', type: 'timestamp with time zone' })
  slaDueAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp with time zone', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
  closedAt?: Date | null;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments: TicketComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
