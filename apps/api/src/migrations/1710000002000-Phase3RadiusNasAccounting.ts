import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3RadiusNasAccounting1710000002000 implements MigrationInterface {
  name = 'Phase3RadiusNasAccounting1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. NAS Devices Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nas_devices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "identifier" varchar(150),
        "ip_address" varchar(50) NOT NULL,
        "secret" varchar(255) NOT NULL,
        "type" varchar(50) NOT NULL DEFAULT 'mikrotik',
        "nas_type" varchar(50) NOT NULL DEFAULT 'other',
        "port" int NOT NULL DEFAULT 1812,
        "coa_port" int NOT NULL DEFAULT 3799,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "last_seen_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_nas_devices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_nas_devices_tenant_name" UNIQUE ("tenant_id", "name")
      );
      CREATE INDEX IF NOT EXISTS "IDX_nas_devices_tenant_id" ON "nas_devices" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_nas_devices_ip_address" ON "nas_devices" ("tenant_id", "ip_address");
      CREATE INDEX IF NOT EXISTS "IDX_nas_devices_status" ON "nas_devices" ("tenant_id", "status");
    `);

    // 2. RADIUS Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "radius_users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "subscriber_id" uuid,
        "username" varchar(100) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "cleartext_password" varchar(255),
        "auth_type" varchar(50) NOT NULL DEFAULT 'PAP',
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "simultaneous_use" int NOT NULL DEFAULT 1,
        "framed_ip_address" varchar(50),
        "mac_address" varchar(50),
        "expiry_date" TIMESTAMP,
        "custom_attributes" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "FK_radius_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_radius_users_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_radius_users_tenant_username" UNIQUE ("tenant_id", "username")
      );
      CREATE INDEX IF NOT EXISTS "IDX_radius_users_tenant_id" ON "radius_users" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_radius_users_subscriber_id" ON "radius_users" ("subscriber_id");
      CREATE INDEX IF NOT EXISTS "IDX_radius_users_status" ON "radius_users" ("tenant_id", "status");
    `);

    // 3. RADIUS Accounting / Sessions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "radius_accounting" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "radius_user_id" uuid,
        "subscriber_id" uuid,
        "nas_id" uuid,
        "username" varchar(100) NOT NULL,
        "acct_session_id" varchar(150) NOT NULL,
        "acct_unique_id" varchar(150) NOT NULL,
        "nas_ip_address" varchar(50) NOT NULL,
        "nas_port" int,
        "framed_ip_address" varchar(50),
        "calling_station_id" varchar(50),
        "called_station_id" varchar(50),
        "acct_status_type" varchar(50) NOT NULL,
        "acct_session_time" int NOT NULL DEFAULT 0,
        "bytes_in" bigint NOT NULL DEFAULT 0,
        "bytes_out" bigint NOT NULL DEFAULT 0,
        "acct_input_gigawords" int NOT NULL DEFAULT 0,
        "acct_output_gigawords" int NOT NULL DEFAULT 0,
        "terminate_cause" varchar(100),
        "start_time" TIMESTAMP NOT NULL DEFAULT now(),
        "stop_time" TIMESTAMP,
        "last_update" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_radius_accounting_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_radius_accounting_user" FOREIGN KEY ("radius_user_id") REFERENCES "radius_users" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_radius_accounting_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_radius_accounting_nas" FOREIGN KEY ("nas_id") REFERENCES "nas_devices" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_radius_accounting_tenant_session" ON "radius_accounting" ("tenant_id", "acct_session_id");
      CREATE INDEX IF NOT EXISTS "IDX_radius_accounting_tenant_username" ON "radius_accounting" ("tenant_id", "username");
      CREATE INDEX IF NOT EXISTS "IDX_radius_accounting_status" ON "radius_accounting" ("tenant_id", "acct_status_type");
      CREATE INDEX IF NOT EXISTS "IDX_radius_accounting_start_time" ON "radius_accounting" ("start_time");
      CREATE INDEX IF NOT EXISTS "IDX_radius_accounting_stop_time" ON "radius_accounting" ("stop_time");
    `);

    // 4. FreeRADIUS standard SQL compatibility views (rlm_sql)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW "nas" AS
      SELECT
        id::text AS id,
        ip_address AS nasname,
        name AS shortname,
        nas_type AS type,
        port AS ports,
        secret,
        NULL::text AS server,
        NULL::text AS community,
        description
      FROM "nas_devices"
      WHERE deleted_at IS NULL AND is_active = true;

      CREATE OR REPLACE VIEW "radcheck" AS
      SELECT
        id::text AS id,
        username,
        CASE
          WHEN auth_type = 'CHAP' THEN 'Cleartext-Password'
          WHEN auth_type = 'MSCHAPv2' THEN 'Cleartext-Password'
          ELSE 'Cleartext-Password'
        END AS attribute,
        ':=' AS op,
        COALESCE(cleartext_password, password_hash) AS value
      FROM "radius_users"
      WHERE deleted_at IS NULL AND status = 'active';

      CREATE OR REPLACE VIEW "radreply" AS
      SELECT
        ru.id::text AS id,
        ru.username,
        'Framed-IP-Address' AS attribute,
        '=' AS op,
        ru.framed_ip_address AS value
      FROM "radius_users" ru
      WHERE ru.deleted_at IS NULL AND ru.status = 'active' AND ru.framed_ip_address IS NOT NULL;

      CREATE OR REPLACE VIEW "radgroupreply" AS
      SELECT
        p.id::text AS id,
        p.name AS groupname,
        'Mikrotik-Rate-Limit' AS attribute,
        ':=' AS op,
        CONCAT(p.upload_speed_mbps, 'M/', p.download_speed_mbps, 'M') AS value
      FROM "packages" p
      WHERE p.deleted_at IS NULL AND p.is_active = true;

      CREATE OR REPLACE VIEW "radusergroup" AS
      SELECT
        ru.id::text AS id,
        ru.username,
        p.name AS groupname,
        1 AS priority
      FROM "radius_users" ru
      JOIN "subscribers" s ON ru.subscriber_id = s.id
      JOIN "packages" p ON s.package_id = p.id
      WHERE ru.deleted_at IS NULL AND s.deleted_at IS NULL AND p.deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "radusergroup" CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS "radgroupreply" CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS "radreply" CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS "radcheck" CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS "nas" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "radius_accounting" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "radius_users" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nas_devices" CASCADE;`);
  }
}
