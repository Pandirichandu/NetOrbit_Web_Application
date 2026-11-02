import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { CaptiveService } from './captive.service';
import { CaptiveController } from './captive.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Subscriber]),
    VouchersModule,
    AuditModule,
  ],
  controllers: [CaptiveController],
  providers: [CaptiveService],
  exports: [CaptiveService],
})
export class CaptiveModule {}
