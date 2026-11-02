import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { QueueModule } from './core/queue/queue.module';
import { LoggerModule } from './core/logger/logger.module';
import { AuditModule } from './core/audit/audit.module';
import { HealthModule } from './core/health/health.module';
import { MetricsModule } from './core/metrics/metrics.module';
import { StorageModule } from './core/storage/storage.module';

// Business modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PackagesModule } from './modules/packages/packages.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { NasModule } from './modules/nas/nas.module';
import { RadiusModule } from './modules/radius/radius.module';
import { BillingModule } from './modules/billing/billing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { CaptiveModule } from './modules/captive/captive.module';
import { IpamModule } from './modules/ipam/ipam.module';
import { DhcpModule } from './modules/dhcp/dhcp.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { CrmModule } from './modules/crm/crm.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AutomationModule } from './modules/automation/automation.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SnmpModule } from './modules/snmp/snmp.module';
import { RoutingModule } from './modules/routing/routing.module';
import { RadiusMeshModule } from './modules/radius-mesh/radius-mesh.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config
import { configSchema } from './core/config/config.schema';

@Module({
  imports: [
    // Environment configuration (loads .env, validates schema)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: { allowUnknown: true, abortEarly: true },
    }),

    // Event emitter for domain events
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Core infrastructure
    LoggerModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    AuditModule,
    HealthModule,
    MetricsModule,
    StorageModule,

    // Business modules
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    PackagesModule,
    SubscribersModule,
    NasModule,
    RadiusModule,
    BillingModule,
    PaymentsModule,
    VouchersModule,
    CaptiveModule,
    IpamModule,
    DhcpModule,
    TicketsModule,
    CrmModule,
    NotificationsModule,
    AutomationModule,
    WebhooksModule,
    ReportsModule,
    SnmpModule,
    RoutingModule,
    RadiusMeshModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

