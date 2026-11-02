export enum RoutingProtocol {
  BGP = 'BGP',
  OSPF = 'OSPF',
}

export enum BgpPeerStatus {
  IDLE = 'IDLE',
  CONNECT = 'CONNECT',
  ACTIVE = 'ACTIVE',
  OPEN_SENT = 'OPEN_SENT',
  OPEN_CONFIRM = 'OPEN_CONFIRM',
  ESTABLISHED = 'ESTABLISHED',
}

export enum OspfNeighborState {
  DOWN = 'DOWN',
  ATTEMPT = 'ATTEMPT',
  INIT = 'INIT',
  TWO_WAY = '2-WAY',
  EXSTART = 'EXSTART',
  EXCHANGE = 'EXCHANGE',
  LOADING = 'LOADING',
  FULL = 'FULL',
}

export enum RoutingVendor {
  MIKROTIK_ROUTEROS = 'MIKROTIK_ROUTEROS',
  CISCO_IOS_XE = 'CISCO_IOS_XE',
  GENERIC_VYOS = 'GENERIC_VYOS',
}

export interface IBgpPeer {
  id: string;
  tenantId: string | null;
  deviceId?: string;
  name: string;
  description?: string;
  localAsn: number;
  remoteAsn: number;
  peerIp: string;
  status: BgpPeerStatus;
  prefixesReceived: number;
  prefixesAdvertised: number;
  uptimeSeconds: number;
  lastError?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IOspfProcess {
  id: string;
  tenantId: string | null;
  deviceId?: string;
  processId: number;
  routerId: string;
  areaId: string;
  authType: 'NONE' | 'SIMPLE' | 'MD5';
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  interfacesCount: number;
  neighborsCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IOspfNeighbor {
  id: string;
  processId: string;
  neighborId: string;
  ipAddress: string;
  interfaceName: string;
  state: OspfNeighborState;
  priority: number;
  deadTimeSeconds: number;
}

export interface IRoutingConfigRevision {
  id: string;
  tenantId: string | null;
  deviceId: string;
  protocol: RoutingProtocol;
  rawConfig: string;
  appliedDiff?: string;
  deployedBy: string;
  deployedAt: Date | string;
  rollbackTargetId?: string;
  status: 'PENDING' | 'APPLIED' | 'FAILED' | 'ROLLED_BACK';
}

export interface IRoutingValidationResult {
  isValid: boolean;
  protocol: RoutingProtocol;
  vendor: RoutingVendor;
  generatedConfig: string;
  errors: string[];
  warnings: string[];
}
