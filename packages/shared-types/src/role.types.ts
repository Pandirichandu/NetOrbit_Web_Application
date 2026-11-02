export enum SystemRole {
  SUPER_ADMINISTRATOR = 'super_administrator',
  TENANT_ADMINISTRATOR = 'tenant_administrator',
  NETWORK_ADMINISTRATOR = 'network_administrator',
  BILLING_EXECUTIVE = 'billing_executive',
  CUSTOMER_SUPPORT = 'customer_support',
  CUSTOMER = 'customer',
}

export interface RoleDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  tenantId?: string | null;
  permissions: PermissionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  resource: string;
  action: string;
  description?: string;
}
