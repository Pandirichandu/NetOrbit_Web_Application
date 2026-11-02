export enum VoucherStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

export interface VoucherDto {
  id: string;
  tenantId: string;
  code: string;
  pin?: string | null;
  batchNumber?: string | null;
  packageId?: string | null;
  durationMinutes: number;
  dataQuotaMb?: number | null;
  status: VoucherStatus;
  redeemedBySubscriberId?: string | null;
  redeemedByMac?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
  maxUses: number;
  usedCount: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateVouchersDto {
  quantity: number;
  prefix?: string;
  packageId?: string;
  durationMinutes?: number;
  dataQuotaMb?: number;
  expiresAt?: string;
  price?: number;
  maxUses?: number;
}

export interface RedeemVoucherDto {
  code: string;
  pin?: string;
  subscriberId?: string;
  macAddress?: string;
}
