import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5OperationsCrmTicketsAutomation1710000004000 implements MigrationInterface {
  name = 'Phase5OperationsCrmTicketsAutomation1710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tickets Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "ticket_number" varchar(100) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "category" varchar(50) NOT NULL DEFAULT 'TECHNICAL',
        "priority" varchar(50) NOT NULL DEFAULT 'MEDIUM',
        "status" varchar(50) NOT NULL DEFAULT 'OPEN',
        "subscriber_id" uuid,
        "created_by_id" uuid,
        "assigned_to_id" uuid,
        "sla_hours" int NOT NULL DEFAULT 24,
        "sla_due_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "FK_tickets_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tickets_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_tickets_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_tickets_assigned_to" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_tickets_tenant_number" UNIQUE ("tenant_id", "ticket_number")
      );
      CREATE INDEX IF NOT EXISTS "IDX_tickets_tenant_id" ON "tickets" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_tickets_status" ON "tickets" ("tenant_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_tickets_priority" ON "tickets" ("priority");
      CREATE INDEX IF NOT EXISTS "IDX_tickets_subscriber_id" ON "tickets" ("subscriber_id");
    `);

    // 2. Ticket Comments Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ticket_comments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "comment" text NOT NULL,
        "is_internal" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_ticket_comments_ticket" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ticket_comments_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_ticket_comments_ticket_id" ON "ticket_comments" ("ticket_id");
    `);

    // 3. Leads Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "phone" varchar(50) NOT NULL,
        "email" varchar(150),
        "address" text,
        "interested_package" varchar(100),
        "status" varchar(50) NOT NULL DEFAULT 'NEW',
        "notes" text,
        "converted_subscriber_id" uuid,
        "converted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "FK_leads_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leads_converted_subscriber" FOREIGN KEY ("converted_subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_leads_tenant_id" ON "leads" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_leads_status" ON "leads" ("tenant_id", "status");
    `);

    // 4. Technicians Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "technicians" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "mobile" varchar(50) NOT NULL,
        "email" varchar(150),
        "service_zone" varchar(100),
        "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_technicians_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_technicians_tenant_id" ON "technicians" ("tenant_id");
    `);

    // 5. Installations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "installations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "customer_name" varchar(150) NOT NULL,
        "contact_phone" varchar(50) NOT NULL,
        "address" text NOT NULL,
        "scheduled_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'SCHEDULED',
        "lead_id" uuid,
        "subscriber_id" uuid,
        "technician_id" uuid,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_installations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_installations_lead" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_installations_subscriber" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_installations_technician" FOREIGN KEY ("technician_id") REFERENCES "technicians" ("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_installations_tenant_id" ON "installations" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_installations_status" ON "installations" ("status");
    `);

    // 6. Complaints Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "complaints" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "customer_name" varchar(150) NOT NULL,
        "phone" varchar(50) NOT NULL,
        "category" varchar(50) NOT NULL DEFAULT 'NO_INTERNET',
        "description" text NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'OPEN',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_complaints_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_complaints_tenant_id" ON "complaints" ("tenant_id");
    `);

    // 7. Notifications Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "channel" varchar(50) NOT NULL DEFAULT 'EMAIL',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'SENT',
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_notifications_tenant_id" ON "notifications" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient" ON "notifications" ("recipient");
    `);

    // 8. Notification Templates Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "event_key" varchar(100) NOT NULL,
        "channel" varchar(50) NOT NULL DEFAULT 'EMAIL',
        "subject" varchar(255) NOT NULL,
        "body_template" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notif_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_notif_templates_event_channel" UNIQUE ("tenant_id", "event_key", "channel")
      );
      CREATE INDEX IF NOT EXISTS "IDX_notif_templates_tenant_id" ON "notification_templates" ("tenant_id");
    `);

    // 9. Automation Rules Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_rules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" text,
        "trigger_event" varchar(100) NOT NULL,
        "action_type" varchar(100) NOT NULL,
        "action_payload" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auto_rules_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_auto_rules_tenant_id" ON "automation_rules" ("tenant_id");
    `);

    // 10. Automation Executions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_executions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "rule_id" uuid NOT NULL,
        "trigger_payload" jsonb,
        "result_status" varchar(50) NOT NULL DEFAULT 'SUCCESS',
        "affected_records_count" int NOT NULL DEFAULT 0,
        "log_details" text,
        "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auto_exec_rule" FOREIGN KEY ("rule_id") REFERENCES "automation_rules" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_auto_exec_rule_id" ON "automation_executions" ("rule_id");
      CREATE INDEX IF NOT EXISTS "IDX_auto_exec_executed_at" ON "automation_executions" ("executed_at");
    `);

    // 11. Webhooks Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "endpoint_url" text NOT NULL,
        "secret_key" varchar(255) NOT NULL,
        "subscribed_events" text[] NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_webhooks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_webhooks_tenant_id" ON "webhooks" ("tenant_id");
    `);

    // 12. Webhook Events Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "webhook_id" uuid NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "response_code" int,
        "response_body" text,
        "duration_ms" int,
        "is_success" boolean NOT NULL DEFAULT true,
        "retry_count" int NOT NULL DEFAULT 0,
        "delivered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_webhook_events_webhook" FOREIGN KEY ("webhook_id") REFERENCES "webhooks" ("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_webhook_events_webhook_id" ON "webhook_events" ("webhook_id");
      CREATE INDEX IF NOT EXISTS "IDX_webhook_events_delivered_at" ON "webhook_events" ("delivered_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_executions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_rules" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaints" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "installations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "technicians" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_comments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets" CASCADE;`);
  }
}
