export enum AutomationTrigger {
  EXPIRY_REACHED = 'EXPIRY_REACHED',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  DATA_QUOTA_80_PERCENT = 'DATA_QUOTA_80_PERCENT',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
}

export enum AutomationAction {
  SUSPEND_SUBSCRIBER = 'SUSPEND_SUBSCRIBER',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  DISCONNECT_SESSION_COA = 'DISCONNECT_SESSION_COA',
}

export interface IAutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  triggerEvent: AutomationTrigger;
  actionType: AutomationAction;
  actionPayload?: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  executions?: IAutomationExecution[];
}

export interface IAutomationExecution {
  id: string;
  ruleId: string;
  triggerPayload?: Record<string, any> | null;
  resultStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  affectedRecordsCount: number;
  logDetails?: string | null;
  executedAt: string;
}

export interface CreateAutomationRuleDto {
  name: string;
  description?: string;
  triggerEvent: AutomationTrigger;
  actionType: AutomationAction;
  actionPayload?: Record<string, any>;
  isActive?: boolean;
}

export interface SweepResult {
  success: boolean;
  timestamp: string;
  affectedCount: number;
  details: string;
  records?: Array<{ id: string; identifier: string; actionTaken: string }>;
}
