import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4BillingPaymentsVouchersIpamDhcp1710000003000 implements MigrationInterface {
  name = 'Phase4BillingPaymentsVouchersIpamDhcp1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Invoices Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "subscriber_id" uuid,
        "invoice_number" varchar(100) NOT NULL,
        "billing_cycle" varchar(50) NOT NULL DEFAULT 'monthly',
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "subtotal" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "tax_rate" decimal(5, 2) NOT NULL DEFAULT 18.00,
        "tax_amount" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "discount_amount" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "total_amount" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "paid_amount" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "balance_amount" decimal(12, 2) NOT NULL DEFAULT 0.00,
        "currency" varchar(10) NOT NULL DEFAULT 'USD',
        "issue_date" date NOT NULL DEFAULT CURRENT_DATE,
        "due_date" date NOT NULL,
        "paid_at" TIMESTAMP,
        "items" jsonb NOT NULL DEFAULT '[]',
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoices_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_invoices_tenant_number" UNIQUE ("tenant_id", "invoice_number")
      );
      CREATE INDEX IF NOT EXISTS "IDX_invoices_tenant_id" ON "invoices" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_invoices_subscriber_id" ON "invoices" ("subscriber_id");
      CREATE INDEX IF NOT EXISTS "IDX_invoices_status" ON "invoices" ("tenant_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_invoices_due_date" ON "invoices" ("due_date");
    `);

    // 2. Payment Transactions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "invoice_id" uuid,
        "subscriber_id" uuid,
        "gateway" varchar(50) NOT NULL,
        "gateway_transaction_id" varchar(255),
        "gateway_order_id" varchar(255),
        "amount" decimal(12, 2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'USD',
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "payment_method" varchar(50),
        "gateway_response" jsonb DEFAULT '{}',
        "idempotency_key" varchar(255),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payments_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_payments_tenant_id" ON "payment_transactions" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_invoice_id" ON "payment_transactions" ("invoice_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_subscriber_id" ON "payment_transactions" ("subscriber_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_gateway_tx" ON "payment_transactions" ("gateway", "gateway_transaction_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_idempotency" ON "payment_transactions" ("tenant_id", "idempotency_key");
    `);

    // 3. Vouchers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vouchers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "code" varchar(100) NOT NULL,
        "pin" varchar(50),
        "batch_number" varchar(100),
        "package_id" uuid,
        "duration_minutes" int NOT NULL DEFAULT 1440,
        "data_quota_mb" bigint,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "redeemed_by_subscriber_id" uuid,
        "redeemed_by_mac" varchar(50),
        "redeemed_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "max_uses" int NOT NULL DEFAULT 1,
        "used_count" int NOT NULL DEFAULT 0,
        "price" decimal(10, 2) NOT NULL DEFAULT 0.00,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_vouchers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vouchers_package" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_vouchers_subscriber" FOREIGN KEY ("redeemed_by_subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_vouchers_tenant_code" UNIQUE ("tenant_id", "code")
      );
      CREATE INDEX IF NOT EXISTS "IDX_vouchers_tenant_id" ON "vouchers" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_vouchers_batch" ON "vouchers" ("tenant_id", "batch_number");
      CREATE INDEX IF NOT EXISTS "IDX_vouchers_status" ON "vouchers" ("tenant_id", "status");
    `);

    // 4. IP Pools Table (IPAM)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ip_pools" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "subnet" varchar(100) NOT NULL,
        "start_ip" varchar(50) NOT NULL,
        "end_ip" varchar(50) NOT NULL,
        "gateway" varchar(50),
        "dns_servers" varchar(255),
        "type" varchar(50) NOT NULL DEFAULT 'dynamic',
        "ip_version" varchar(10) NOT NULL DEFAULT 'ipv4',
        "total_ips" int NOT NULL DEFAULT 0,
        "allocated_ips" int NOT NULL DEFAULT 0,
        "reserved_ips" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_ip_pools_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_ip_pools_tenant_name" UNIQUE ("tenant_id", "name")
      );
      CREATE INDEX IF NOT EXISTS "IDX_ip_pools_tenant_id" ON "ip_pools" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_ip_pools_type" ON "ip_pools" ("tenant_id", "type");
    `);

    // 5. IP Allocations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ip_allocations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "pool_id" uuid NOT NULL,
        "ip_address" varchar(50) NOT NULL,
        "mac_address" varchar(50),
        "status" varchar(50) NOT NULL DEFAULT 'allocated',
        "allocated_to_type" varchar(50) NOT NULL DEFAULT 'subscriber',
        "allocated_to_id" varchar(255),
        "reserved_reason" text,
        "allocated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "released_at" TIMESTAMP,
        CONSTRAINT "FK_ip_allocations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ip_allocations_pool" FOREIGN KEY ("pool_id") REFERENCES "ip_pools" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_ip_allocations_pool_ip" UNIQUE ("tenant_id", "pool_id", "ip_address")
      );
      CREATE INDEX IF NOT EXISTS "IDX_ip_allocations_tenant_id" ON "ip_allocations" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_ip_allocations_pool_id" ON "ip_allocations" ("pool_id");
      CREATE INDEX IF NOT EXISTS "IDX_ip_allocations_ip" ON "ip_allocations" ("tenant_id", "ip_address");
      CREATE INDEX IF NOT EXISTS "IDX_ip_allocations_target" ON "ip_allocations" ("allocated_to_type", "allocated_to_id");
    `);

    // 6. DHCP Scopes Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dhcp_scopes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "pool_id" uuid,
        "name" varchar(150) NOT NULL,
        "interface_name" varchar(100) NOT NULL DEFAULT 'ether2-lan',
        "lease_time_seconds" int NOT NULL DEFAULT 86400,
        "domain_name" varchar(150) NOT NULL DEFAULT 'lan.netorbit.local',
        "dns_servers" varchar(255) NOT NULL DEFAULT '8.8.8.8, 1.1.1.1',
        "gateway" varchar(50),
        "subnet_mask" varchar(50) NOT NULL DEFAULT '255.255.255.0',
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_dhcp_scopes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dhcp_scopes_pool" FOREIGN KEY ("pool_id") REFERENCES "ip_pools" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_dhcp_scopes_tenant_name" UNIQUE ("tenant_id", "name")
      );
      CREATE INDEX IF NOT EXISTS "IDX_dhcp_scopes_tenant_id" ON "dhcp_scopes" ("tenant_id");
    `);

    // 7. DHCP Leases Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dhcp_leases" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "scope_id" uuid NOT NULL,
        "ip_address" varchar(50) NOT NULL,
        "mac_address" varchar(50) NOT NULL,
        "hostname" varchar(150),
        "is_static" boolean NOT NULL DEFAULT false,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "starts_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_dhcp_leases_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dhcp_leases_scope" FOREIGN KEY ("scope_id") REFERENCES "dhcp_scopes" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_dhcp_leases_scope_ip" UNIQUE ("tenant_id", "scope_id", "ip_address")
      );
      CREATE INDEX IF NOT EXISTS "IDX_dhcp_leases_tenant_id" ON "dhcp_leases" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_dhcp_leases_mac" ON "dhcp_leases" ("tenant_id", "mac_address");
      CREATE INDEX IF NOT EXISTS "IDX_dhcp_leases_status" ON "dhcp_leases" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dhcp_leases" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dhcp_scopes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ip_allocations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ip_pools" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vouchers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices" CASCADE;`);
  }
}
