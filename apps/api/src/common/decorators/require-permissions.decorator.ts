import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Specify one or more required permissions (e.g., 'subscribers:create')
 * The user must have ALL listed permissions unless they are Super Admin or Tenant Admin
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
