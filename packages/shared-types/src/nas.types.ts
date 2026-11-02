export enum NasType {
  MIKROTIK = 'mikrotik',
  CISCO = 'cisco',
  UBIQUITI = 'ubiquiti',
  GENERIC = 'generic',
}

export enum NasStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNREACHABLE = 'unreachable',
}

export interface INasDevice {
  id: string;
  tenantId: string;
  name: string;
  ipAddress: string;
  secret?: string; // masked in responses
  type: NasType;
  nasType: string;
  port: number;
  coaPort: number;
  description?: string;
  isActive: boolean;
  status: NasStatus;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNasDto {
  name: string;
  ipAddress: string;
  secret: string;
  type?: NasType;
  nasType?: string;
  port?: number;
  coaPort?: number;
  description?: string;
  isActive?: boolean;
  tenantId?: string;
}

export interface UpdateNasDto {
  name?: string;
  ipAddress?: string;
  secret?: string;
  type?: NasType;
  nasType?: string;
  port?: number;
  coaPort?: number;
  description?: string;
  isActive?: boolean;
}
