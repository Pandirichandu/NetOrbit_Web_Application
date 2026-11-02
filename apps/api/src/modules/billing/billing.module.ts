import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Subscriber, Package, Tenant, PaymentTransaction]),
    AuditModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
