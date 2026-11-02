/**
 * SRS-defined primary roles — exactly 6 as specified in NetOrbit SRS
 * These are seeded on startup and cannot be deleted
 */
export enum SystemRole {
  SUPER_ADMINISTRATOR = 'super_administrator',
  TENANT_ADMINISTRATOR = 'tenant_administrator',
  NETWORK_ADMINISTRATOR = 'network_administrator',
  BILLING_EXECUTIVE = 'billing_executive',
  CUSTOMER_SUPPORT = 'customer_support',
  CUSTOMER = 'customer',
}

/**
 * Optional sub-roles (not in SRS — extensions only)
 * Must be explicitly enabled per tenant
 */
export enum OptionalSubRole {
  FIELD_TECHNICIAN = 'field_technician',
  READONLY_VIEWER = 'readonly_viewer',
  BILLING_AUDITOR = 'billing_auditor',
  NETWORK_MONITOR = 'network_monitor',
}

export const SYSTEM_ROLES: SystemRole[] = Object.values(SystemRole);
export const ALL_ROLES = [...Object.values(SystemRole), ...Object.values(OptionalSubRole)];
