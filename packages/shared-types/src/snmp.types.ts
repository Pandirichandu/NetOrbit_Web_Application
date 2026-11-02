export enum SnmpVersion {
  V2C = 'v2c',
  V3 = 'v3',
}

export enum SnmpSecurityLevel {
  NO_AUTH_NO_PRIV = 'noAuthNoPriv',
  AUTH_NO_PRIV = 'authNoPriv',
  AUTH_PRIV = 'authPriv',
}

export enum SnmpAuthProtocol {
  MD5 = 'MD5',
  SHA = 'SHA',
}

export enum SnmpPrivProtocol {
  DES = 'DES',
  AES = 'AES',
}

export enum NetworkDeviceStatus {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
  UNREACHABLE = 'UNREACHABLE',
}

export enum InterfaceAdminStatus {
  UP = 'UP',
  DOWN = 'DOWN',
}

export enum InterfaceOperStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  TESTING = 'TESTING',
  UNKNOWN = 'UNKNOWN',
  DORMANT = 'DORMANT',
}

export enum TopologyLinkType {
  LLDP = 'LLDP',
  CDP = 'CDP',
  SUBNET = 'SUBNET',
  MANUAL = 'MANUAL',
}

export interface ISnmpDevice {
  id: string;
  tenantId: string | null;
  name: string;
  ipAddress: string;
  port: number;
  version: SnmpVersion;
  vendor: string;
  model: string;
  sysName?: string;
  sysDescr?: string;
  sysLocation?: string;
  uptimeSeconds?: number;
  status: NetworkDeviceStatus;
  pollingIntervalSeconds: number;
  lastPolledAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface INetworkInterface {
  id: string;
  deviceId: string;
  ifIndex: number;
  name: string;
  alias?: string;
  macAddress?: string;
  adminStatus: InterfaceAdminStatus;
  operStatus: InterfaceOperStatus;
  speedBps: number;
  inOctets: number;
  outOctets: number;
  inErrors: number;
  outErrors: number;
  lastPolledAt?: Date | string | null;
}

export interface ITopologyLink {
  id: string;
  tenantId: string | null;
  sourceDeviceId: string;
  sourceDeviceName?: string;
  sourceInterfaceId?: string;
  sourceInterfaceName?: string;
  targetDeviceId: string;
  targetDeviceName?: string;
  targetInterfaceId?: string;
  targetInterfaceName?: string;
  linkType: TopologyLinkType;
  speedBps: number;
  status: 'UP' | 'DOWN';
  lastDiscoveredAt: Date | string;
}

export interface ISnmpPollResult {
  deviceId: string;
  status: NetworkDeviceStatus;
  responseTimeMs: number;
  sysName?: string;
  sysDescr?: string;
  uptimeSeconds?: number;
  interfacesFound: number;
  timestamp: string;
}
