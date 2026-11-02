export enum IpPoolType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  CGNAT = 'cgnat',
  HOTSPOT = 'hotspot',
  DHCP = 'dhcp',
  PPPOE = 'pppoe',
}

export enum IpVersion {
  IPV4 = 'ipv4',
  IPV6 = 'ipv6',
}

export enum IpAllocationStatus {
  ALLOCATED = 'allocated',
  RESERVED = 'reserved',
  RELEASED = 'released',
}

export interface IpPoolDto {
  id: string;
  tenantId: string;
  name: string;
  subnet: string;
  startIp: string;
  endIp: string;
  gateway?: string | null;
  dnsServers?: string | null;
  type: IpPoolType;
  ipVersion: IpVersion;
  totalIps: number;
  allocatedIps: number;
  reservedIps: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IpAllocationDto {
  id: string;
  tenantId: string;
  poolId: string;
  ipAddress: string;
  macAddress?: string | null;
  status: IpAllocationStatus;
  allocatedToType: string;
  allocatedToId?: string | null;
  reservedReason?: string | null;
  allocatedAt: string;
  releasedAt?: string | null;
}

export interface CreateIpPoolDto {
  name: string;
  subnet: string;
  startIp?: string;
  endIp?: string;
  gateway?: string;
  dnsServers?: string;
  type?: IpPoolType;
  ipVersion?: IpVersion;
}
