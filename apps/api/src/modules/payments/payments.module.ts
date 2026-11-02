import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, Invoice, Subscriber, Tenant]),
    AuditModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentProcessorService, PaymentsService],
  exports: [PaymentsService, PaymentProcessorService],
})
export class PaymentsModule {}
