import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { RadiusAccounting } from '../radius/entities/radius-accounting.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Package } from '../packages/entities/package.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ReportsService } from './reports.service';
import { AnalyticsController, ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscriber,
      Invoice,
      PaymentTransaction,
      RadiusAccounting,
      Ticket,
      Package,
      Tenant,
    ]),
  ],
  controllers: [AnalyticsController, ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
