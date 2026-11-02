export enum WebhookEventType {
  SUBSCRIBER_CREATED = 'subscriber.created',
  SUBSCRIBER_SUSPENDED = 'subscriber.suspended',
  INVOICE_CREATED = 'invoice.created',
  PAYMENT_SUCCESS = 'payment.success',
  TICKET_CREATED = 'ticket.created',
  SESSION_DISCONNECTED = 'session.disconnected',
}

export interface IWebhook {
  id: string;
  tenantId: string;
  name: string;
  endpointUrl: string;
  secretKey?: string; // Only returned on creation
  maskedSecret?: string;
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  eventsCount?: number;
}

export interface IWebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  responseCode?: number | null;
  responseBody?: string | null;
  durationMs?: number | null;
  isSuccess: boolean;
  retryCount: number;
  deliveredAt: string;
}

export interface CreateWebhookDto {
  name: string;
  endpointUrl: string;
  subscribedEvents: string[];
  isActive?: boolean;
}

export interface TestWebhookResult {
  success: boolean;
  statusCode?: number;
  responsePreview?: string;
  signature: string;
  timestamp: string;
  durationMs: number;
}
