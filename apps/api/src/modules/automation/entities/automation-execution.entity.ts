import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutomationRule } from './automation-rule.entity';

@Entity('automation_executions')
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  @Index()
  ruleId: string;

  @ManyToOne(() => AutomationRule, (rule) => rule.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: AutomationRule;

  @Column({ name: 'trigger_payload', type: 'jsonb', nullable: true })
  triggerPayload?: Record<string, any> | null;

  @Column({ name: 'result_status', type: 'varchar', length: 50, default: 'SUCCESS' })
  @Index()
  resultStatus: string;

  @Column({ name: 'affected_records_count', type: 'int', default: 0 })
  affectedRecordsCount: number;

  @Column({ name: 'log_details', type: 'text', nullable: true })
  logDetails?: string | null;

  @Column({ name: 'executed_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  executedAt: Date;
}
