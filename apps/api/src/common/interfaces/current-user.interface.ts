export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  mfaVerified?: boolean;
}

export type ICurrentUser = CurrentUser;
