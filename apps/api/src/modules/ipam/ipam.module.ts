import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpPool } from './entities/ip-pool.entity';
import { IpAddressAllocation } from './entities/ip-allocation.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { IpamService } from './ipam.service';
import { IpamController } from './ipam.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IpPool, IpAddressAllocation, Tenant]),
    AuditModule,
  ],
  controllers: [IpamController],
  providers: [IpamService],
  exports: [IpamService],
})
export class IpamModule {}
