export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  FEASIBILITY_CHECK = 'FEASIBILITY_CHECK',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export enum InstallationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TechnicianStatus {
  ACTIVE = 'ACTIVE',
  BUSY = 'BUSY',
  OFF_DUTY = 'OFF_DUTY',
}

export enum ComplaintCategory {
  NO_INTERNET = 'NO_INTERNET',
  SLOW_SPEED = 'SLOW_SPEED',
  BILLING_ISSUE = 'BILLING_ISSUE',
  ROUTER_FAULT = 'ROUTER_FAULT',
}

export interface ILead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  interestedPackage?: string | null;
  status: LeadStatus;
  notes?: string | null;
  convertedSubscriberId?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IInstallation {
  id: string;
  tenantId: string;
  customerName: string;
  contactPhone: string;
  address: string;
  scheduledDate: string;
  status: InstallationStatus;
  leadId?: string | null;
  subscriberId?: string | null;
  technicianId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  technician?: any;
}

export interface ITechnician {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string | null;
  serviceZone?: string | null;
  status: TechnicianStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IComplaint {
  id: string;
  tenantId: string;
  customerName: string;
  phone: string;
  category: ComplaintCategory;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  interestedPackage?: string;
  notes?: string;
}

export interface UpdateLeadDto {
  status?: LeadStatus;
  notes?: string;
  interestedPackage?: string;
}

export interface ConvertLeadDto {
  packageId: string;
  installationAddress?: string;
  password?: string;
}

export interface CreateInstallationDto {
  customerName: string;
  contactPhone: string;
  address: string;
  scheduledDate: string;
  technicianId?: string;
  leadId?: string;
  subscriberId?: string;
  notes?: string;
}

export interface UpdateInstallationDto {
  status?: InstallationStatus;
  technicianId?: string;
  notes?: string;
}

export interface CreateTechnicianDto {
  name: string;
  mobile: string;
  email?: string;
  serviceZone?: string;
  status?: TechnicianStatus;
}
