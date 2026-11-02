export enum PackageType {
  BROADBAND = 'broadband',
  HOTSPOT = 'hotspot',
  DEDICATED = 'dedicated',
  FIBER = 'fiber',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  DAILY = 'daily',
  CUSTOM = 'custom',
}

export interface PackageDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  type: PackageType;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  validityDays: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  dataQuotaGb?: number | null;
  burstSpeedMbps?: number | null;
  speedAfterQuotaMbps?: number | null;
  isActive: boolean;
  isPublic: boolean;
  features?: string[] | Record<string, any>;
  createdAt: string;
  updatedAt: string;
  subscriberCount?: number;
}

export interface CreatePackageDto {
  name: string;
  slug?: string;
  description?: string;
  type: PackageType;
  price: number;
  currency?: string;
  billingCycle: BillingCycle;
  validityDays: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  dataQuotaGb?: number | null;
  burstSpeedMbps?: number | null;
  speedAfterQuotaMbps?: number | null;
  isActive?: boolean;
  isPublic?: boolean;
  features?: string[] | Record<string, any>;
}

export interface UpdatePackageDto extends Partial<CreatePackageDto> {}
