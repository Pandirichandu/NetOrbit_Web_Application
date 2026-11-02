import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { RadiusAccounting } from '../radius/entities/radius-accounting.entity';
import { RadiusModule } from '../radius/radius.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationRule,
      AutomationExecution,
      Subscriber,
      Invoice,
      RadiusAccounting,
      Tenant,
    ]),
    RadiusModule,
    NotificationsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
