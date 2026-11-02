export enum RadiusMeshNodeStatus {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
  SYNCHRONIZING = 'SYNCHRONIZING',
}

export enum RadiusMeshNodeRole {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  EDGE_PROXY = 'EDGE_PROXY',
}

export enum RadiusFailoverStrategy {
  PRIORITY = 'PRIORITY',
  LOWEST_LATENCY = 'LOWEST_LATENCY',
  GEOGRAPHIC_AFFINITY = 'GEOGRAPHIC_AFFINITY',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export interface IRadiusMeshNode {
  id: string;
  tenantId: string | null;
  nodeId: string;
  name: string;
  region: string;
  ipAddress: string;
  authPort: number;
  acctPort: number;
  coaPort: number;
  status: RadiusMeshNodeStatus;
  role: RadiusMeshNodeRole;
  priority: number;
  latencyMs: number;
  loadFactor: number;
  activeSessionsCount: number;
  lastHeartbeatAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IRadiusForwardRequest {
  originNodeId: string;
  targetNodeId: string;
  packetType: 'ACCESS_REQUEST' | 'ACCOUNTING_REQUEST' | 'COA_REQUEST';
  username: string;
  sessionId?: string;
  nasIpAddress: string;
  timestamp: string;
}

export interface IRadiusMeshRouteResult {
  selectedNode: IRadiusMeshNode;
  strategyUsed: RadiusFailoverStrategy;
  failoverCandidates: IRadiusMeshNode[];
  estimatedLatencyMs: number;
}
