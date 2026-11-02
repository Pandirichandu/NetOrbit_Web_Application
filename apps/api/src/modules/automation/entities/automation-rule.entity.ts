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
import { AutomationExecution } from './automation-execution.entity';
import { AutomationTrigger, AutomationAction } from '@netorbit/shared-types';

@Entity('automation_rules')
export class AutomationRule {
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

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'trigger_event', type: 'varchar', length: 100 })
  @Index()
  triggerEvent: AutomationTrigger;

  @Column({ name: 'action_type', type: 'varchar', length: 100 })
  @Index()
  actionType: AutomationAction;

  @Column({ name: 'action_payload', type: 'jsonb', nullable: true })
  actionPayload?: Record<string, any> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @OneToMany(() => AutomationExecution, (execution) => execution.rule)
  executions: AutomationExecution[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
