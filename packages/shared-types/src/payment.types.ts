export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  PHONEPE = 'phonepe',
  CASHFREE = 'cashfree',
  MANUAL = 'manual',
  MANUAL_CASH = 'manual_cash',
  MANUAL_BANK_TRANSFER = 'manual_bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export interface PaymentTransactionDto {
  id: string;
  tenantId: string;
  invoiceId?: string | null;
  subscriberId?: string | null;
  gateway: PaymentGateway;
  gatewayTransactionId?: string | null;
  gatewayOrderId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  invoiceId?: string;
  subscriberId?: string;
  gateway: PaymentGateway;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface VerifyPaymentDto {
  gateway: PaymentGateway;
  transactionId?: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  payload?: any;
}
