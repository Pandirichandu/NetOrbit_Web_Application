import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DhcpScope } from './entities/dhcp-scope.entity';
import { DhcpLease } from './entities/dhcp-lease.entity';
import { IpPool } from '../ipam/entities/ip-pool.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { IpamModule } from '../ipam/ipam.module';
import { DhcpService } from './dhcp.service';
import { DhcpController } from './dhcp.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DhcpScope, DhcpLease, IpPool, Tenant]),
    IpamModule,
    AuditModule,
  ],
  controllers: [DhcpController],
  providers: [DhcpService],
  exports: [DhcpService],
})
export class DhcpModule {}
