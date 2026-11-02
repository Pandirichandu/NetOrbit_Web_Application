export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  TECHNICAL = 'TECHNICAL',
  BILLING = 'BILLING',
  PROVISIONING = 'PROVISIONING',
  GENERAL = 'GENERAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface ITicket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subscriberId?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
  slaHours: number;
  slaDueAt: string;
  isSlaBreached?: boolean;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: ITicketComment[];
  subscriber?: any;
  assignedTo?: any;
  createdBy?: any;
}

export interface ITicketComment {
  id: string;
  ticketId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user?: any;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  subscriberId?: string;
  assignedToId?: string;
}

export interface UpdateTicketDto {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedToId?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

export interface CreateTicketCommentDto {
  comment: string;
  isInternal?: boolean;
}
