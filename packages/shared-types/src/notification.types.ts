export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface INotification {
  id: string;
  tenantId: string;
  recipient: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  sentAt?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface INotificationTemplate {
  id: string;
  tenantId: string;
  eventKey: string;
  channel: NotificationChannel;
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SendNotificationDto {
  recipient: string;
  channel?: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDto {
  subject?: string;
  bodyTemplate?: string;
  isActive?: boolean;
}
