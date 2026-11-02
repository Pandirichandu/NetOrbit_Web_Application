import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BgpPeer } from './entities/bgp-peer.entity';
import { OspfProcess } from './entities/ospf-process.entity';
import { OspfNeighbor } from './entities/ospf-neighbor.entity';
import { RoutingConfigRevision } from './entities/routing-config-revision.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BgpPeer,
      OspfProcess,
      OspfNeighbor,
      RoutingConfigRevision,
      Tenant,
    ]),
  ],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
