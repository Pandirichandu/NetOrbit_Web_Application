import { BillingCycle } from './package.types';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  VOID = 'void',
  CANCELLED = 'cancelled',
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  packageId?: string;
}

export interface InvoiceDto {
  id: string;
  tenantId: string;
  subscriberId?: string | null;
  invoiceNumber: string;
  billingCycle: BillingCycle;
  status: InvoiceStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  items: InvoiceItem[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceDto {
  subscriberId?: string;
  billingCycle?: BillingCycle;
  issueDate?: string;
  dueDate?: string;
  items: InvoiceItem[];
  taxRate?: number;
  discountAmount?: number;
  currency?: string;
  notes?: string;
}

export interface RechargeDto {
  subscriberId: string;
  packageId?: string;
  gateway?: string;
  amount?: number;
  notes?: string;
}
