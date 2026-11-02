export enum SubscriberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum IpAssignmentType {
  DYNAMIC = 'dynamic',
  STATIC = 'static',
  PPPOE = 'pppoe',
  DHCP = 'dhcp',
}

export interface SubscriberPackageSummary {
  id: string;
  name: string;
  price: number;
  currency: string;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  billingCycle: string;
}

export interface SubscriberDto {
  id: string;
  tenantId: string;
  accountNumber: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  companyName?: string | null;
  nationalId?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gpsCoordinates?: string | null;
  packageId?: string | null;
  package?: SubscriberPackageSummary | null;
  ipAssignmentType: IpAssignmentType;
  staticIp?: string | null;
  macAddress?: string | null;
  username: string;
  status: SubscriberStatus;
  startDate?: string | null;
  expiryDate?: string | null;
  installationDate?: string | null;
  autoRenew: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriberDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  companyName?: string;
  nationalId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  gpsCoordinates?: string;
  packageId?: string;
  ipAssignmentType?: IpAssignmentType;
  staticIp?: string;
  macAddress?: string;
  username: string;
  password?: string;
  autoRenew?: boolean;
  notes?: string;
  createPortalUser?: boolean;
}

export interface UpdateSubscriberDto extends Partial<CreateSubscriberDto> {}

export interface ChangeSubscriberStatusDto {
  status: SubscriberStatus;
  reason?: string;
}
