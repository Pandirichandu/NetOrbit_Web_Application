export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  BILLING: 'billing',
  VOUCHERS: 'vouchers',
  AUDIT: 'audit',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
