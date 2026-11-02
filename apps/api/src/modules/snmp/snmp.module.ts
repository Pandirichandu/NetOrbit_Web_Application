import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnmpDevice } from './entities/snmp-device.entity';
import { NetworkInterface } from './entities/network-interface.entity';
import { TopologyLink } from './entities/topology-link.entity';
import { SnmpPollLog } from './entities/snmp-poll-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SnmpService } from './snmp.service';
import { SnmpController } from './snmp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SnmpDevice,
      NetworkInterface,
      TopologyLink,
      SnmpPollLog,
      Tenant,
    ]),
  ],
  controllers: [SnmpController],
  providers: [SnmpService],
  exports: [SnmpService],
})
export class SnmpModule {}
