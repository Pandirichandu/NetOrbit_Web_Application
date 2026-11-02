export enum RadiusAuthType {
  PAP = 'PAP',
  CHAP = 'CHAP',
  MSCHAPV2 = 'MSCHAPv2',
  EAP = 'EAP',
}

export enum RadiusUserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

export enum AcctStatusType {
  START = 'Start',
  INTERIM_UPDATE = 'Interim-Update',
  STOP = 'Stop',
  ACCOUNTING_ON = 'Accounting-On',
  ACCOUNTING_OFF = 'Accounting-Off',
}

export interface IRadiusUser {
  id: string;
  tenantId: string;
  subscriberId?: string | null;
  username: string;
  authType: RadiusAuthType;
  status: RadiusUserStatus;
  simultaneousUse: number;
  framedIpAddress?: string | null;
  macAddress?: string | null;
  expiryDate?: string | null;
  customAttributes?: Record<string, string>;
  subscriber?: {
    id: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    package?: {
      id: string;
      name: string;
      downloadSpeedMbps: number;
      uploadSpeedMbps: number;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRadiusUserDto {
  username: string;
  password?: string;
  subscriberId?: string;
  authType?: RadiusAuthType;
  status?: RadiusUserStatus;
  simultaneousUse?: number;
  framedIpAddress?: string;
  macAddress?: string;
  expiryDate?: string;
  customAttributes?: Record<string, string>;
  tenantId?: string;
}

export interface UpdateRadiusUserDto {
  password?: string;
  subscriberId?: string;
  authType?: RadiusAuthType;
  status?: RadiusUserStatus;
  simultaneousUse?: number;
  framedIpAddress?: string;
  macAddress?: string;
  expiryDate?: string;
  customAttributes?: Record<string, string>;
}

export interface IRadiusSession {
  id: string;
  tenantId: string;
  radiusUserId?: string | null;
  subscriberId?: string | null;
  nasId?: string | null;
  username: string;
  acctSessionId: string;
  acctUniqueId: string;
  nasIpAddress: string;
  nasPort?: number | null;
  framedIpAddress?: string | null;
  callingStationId?: string | null;
  calledStationId?: string | null;
  acctStatusType: AcctStatusType;
  acctSessionTime: number; // in seconds
  bytesIn: string | number; // download octets
  bytesOut: string | number; // upload octets
  terminateCause?: string | null;
  startTime: string;
  stopTime?: string | null;
  lastUpdate: string;
  subscriber?: {
    accountNumber: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface RadiusAuthRequest {
  username: string;
  password?: string;
  chapPassword?: string;
  chapChallenge?: string;
  mschapChallenge?: string;
  mschapResponse?: string;
  nasIpAddress: string;
  nasIdentifier?: string;
  nasPort?: number;
  callingStationId?: string;
  calledStationId?: string;
  serviceType?: string;
  framedProtocol?: string;
  sharedSecret?: string;
}

export interface RadiusAuthResponse {
  code: 'Access-Accept' | 'Access-Reject' | 'Access-Challenge';
  replyMessage?: string;
  attributes?: Record<string, any>;
  sessionTimeout?: number;
  idleTimeout?: number;
  rateLimit?: string;
}

export interface RadiusAcctRequest {
  acctStatusType: AcctStatusType | string;
  username: string;
  acctSessionId: string;
  acctUniqueId?: string;
  nasIpAddress: string;
  nasPort?: number;
  nasIdentifier?: string;
  framedIpAddress?: string;
  callingStationId?: string;
  calledStationId?: string;
  acctSessionTime?: number;
  acctInputOctets?: number;
  acctOutputOctets?: number;
  acctInputGigawords?: number;
  acctOutputGigawords?: number;
  terminateCause?: string;
  sharedSecret?: string;
}

export interface RadiusAcctResponse {
  code: 'Accounting-Response';
  status: 'ok';
  sessionId: string;
  receivedAt: string;
}

export interface RadiusOverviewStats {
  activeSessions: number;
  totalRadiusUsers: number;
  totalNasDevices: number;
  onlineNasDevices: number;
  todayAuthentications: number;
  acceptRatePercent: number;
  totalDataTransferredBytes: number;
}
