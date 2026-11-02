import { RoleDto } from './role.types';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  tenantId?: string | null;
  mfaEnabled: boolean;
  roles: RoleDto[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  tenantId?: string;
  roleIds: string[];
}
