import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2SubscribersPackages1710000001000 implements MigrationInterface {
  name = 'Phase2SubscribersPackages1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Packages Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "packages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "slug" varchar(150) NOT NULL,
        "description" text,
        "type" varchar(50) NOT NULL DEFAULT 'broadband',
        "price" numeric(10, 2) NOT NULL DEFAULT 0.00,
        "currency" varchar(10) NOT NULL DEFAULT 'USD',
        "billing_cycle" varchar(50) NOT NULL DEFAULT 'monthly',
        "validity_days" int NOT NULL DEFAULT 30,
        "download_speed_mbps" int NOT NULL DEFAULT 50,
        "upload_speed_mbps" int NOT NULL DEFAULT 25,
        "data_quota_gb" numeric(10, 2),
        "burst_speed_mbps" numeric(10, 2),
        "speed_after_quota_mbps" numeric(10, 2),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_public" boolean NOT NULL DEFAULT true,
        "features" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_packages_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_packages_tenant_slug" ON "packages" ("tenant_id", "slug");
      CREATE INDEX IF NOT EXISTS "IDX_packages_tenant_active" ON "packages" ("tenant_id", "is_active");
      CREATE INDEX IF NOT EXISTS "IDX_packages_tenant_type" ON "packages" ("tenant_id", "type");
    `);

    // 2. Subscribers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscribers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "account_number" varchar(50) NOT NULL,
        "user_id" uuid,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(30) NOT NULL,
        "alternate_phone" varchar(30),
        "company_name" varchar(150),
        "national_id" varchar(50),
        "address_line1" varchar(255) NOT NULL,
        "address_line2" varchar(255),
        "city" varchar(100) NOT NULL,
        "state" varchar(100) NOT NULL,
        "postal_code" varchar(20) NOT NULL,
        "country" varchar(100) NOT NULL DEFAULT 'US',
        "gps_coordinates" varchar(100),
        "package_id" uuid,
        "ip_assignment_type" varchar(50) NOT NULL DEFAULT 'dynamic',
        "static_ip" varchar(50),
        "mac_address" varchar(50),
        "username" varchar(100) NOT NULL,
        "password_hash" varchar(255),
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "start_date" TIMESTAMP,
        "expiry_date" TIMESTAMP,
        "installation_date" TIMESTAMP,
        "auto_renew" boolean NOT NULL DEFAULT true,
        "notes" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_subscribers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscribers_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_subscribers_package" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_subscribers_tenant_account" UNIQUE ("tenant_id", "account_number"),
        CONSTRAINT "UQ_subscribers_tenant_username" UNIQUE ("tenant_id", "username")
      );
      CREATE INDEX IF NOT EXISTS "IDX_subscribers_tenant_status" ON "subscribers" ("tenant_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_subscribers_tenant_email" ON "subscribers" ("tenant_id", "email");
      CREATE INDEX IF NOT EXISTS "IDX_subscribers_package_id" ON "subscribers" ("package_id");
      CREATE INDEX IF NOT EXISTS "IDX_subscribers_user_id" ON "subscribers" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscribers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "packages" CASCADE;`);
  }
}
