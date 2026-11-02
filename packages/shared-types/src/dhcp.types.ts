export enum DhcpScopeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum DhcpLeaseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RESERVED = 'reserved',
  RELEASED = 'released',
}

export interface DhcpScopeDto {
  id: string;
  tenantId: string;
  poolId?: string | null;
  name: string;
  interfaceName: string;
  leaseTimeSeconds: number;
  domainName: string;
  dnsServers: string;
  gateway?: string | null;
  subnetMask: string;
  status: DhcpScopeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DhcpLeaseDto {
  id: string;
  tenantId: string;
  scopeId: string;
  ipAddress: string;
  macAddress: string;
  hostname?: string | null;
  isStatic: boolean;
  status: DhcpLeaseStatus;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateDhcpScopeDto {
  poolId?: string;
  name: string;
  interfaceName: string;
  leaseTimeSeconds?: number;
  domainName?: string;
  dnsServers?: string;
  gateway?: string;
  subnetMask?: string;
}

export interface CreateStaticReservationDto {
  scopeId: string;
  ipAddress: string;
  macAddress: string;
  hostname?: string;
}
