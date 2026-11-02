export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  mfaVerified?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
  status: 'active' | 'suspended' | 'pending';
}

export interface LoginResponse {
  user?: UserSummary;
  tokens?: AuthTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
  tempToken?: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}
