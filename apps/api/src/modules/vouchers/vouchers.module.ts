import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { Package } from '../packages/entities/package.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, Package, Subscriber, Tenant]),
    AuditModule,
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
