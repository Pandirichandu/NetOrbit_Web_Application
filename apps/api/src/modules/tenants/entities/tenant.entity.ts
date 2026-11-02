import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TenantPlan {
  TRIAL = 'trial',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

export interface TenantFeatures {
  captivePortal: boolean;
  vouchers: boolean;
  whatsappNotifications: boolean;
  multiNas: boolean;
  apiAccess: boolean;
  radiusIntegration: boolean;
  maxSubscribers: number;
  maxNasDevices: number;
  customDomain: string | null;
}

export interface TenantBranding {
  companyName: string;
  logo: string | null;
  primaryColor: string;
  favicon: string | null;
}

export interface TenantBillingConfig {
  currency: string;
  taxRate: number;
  taxName: string;
  invoicePrefix: string;
  paymentGateways: string[];
}

export interface TenantConfig {
  features: TenantFeatures;
  branding: TenantBranding;
  billing: TenantBillingConfig;
}

@Entity('tenants')
@Index(['slug'], { unique: true })
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.TRIAL,
  })
  plan: TenantPlan;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({ type: 'text', nullable: true })
  customDomain: string | null;

  @Column({ type: 'jsonb', default: () => `'${JSON.stringify(defaultTenantConfig())}'` })
  config: TenantConfig;

  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

function defaultTenantConfig(): TenantConfig {
  return {
    features: {
      captivePortal: false,
      vouchers: false,
      whatsappNotifications: false,
      multiNas: false,
      apiAccess: false,
      radiusIntegration: false,
      maxSubscribers: 100,
      maxNasDevices: 5,
      customDomain: null,
    },
    branding: {
      companyName: 'My ISP',
      logo: null,
      primaryColor: '#1a73e8',
      favicon: null,
    },
    billing: {
      currency: 'USD',
      taxRate: 0,
      taxName: 'Tax',
      invoicePrefix: 'INV',
      paymentGateways: ['manual'],
    },
  };
}
