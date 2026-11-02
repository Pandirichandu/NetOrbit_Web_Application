import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiusMeshNode } from './entities/radius-mesh-node.entity';
import { RadiusMeshEvent } from './entities/radius-mesh-event.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { RadiusMeshService } from './radius-mesh.service';
import { RadiusMeshController } from './radius-mesh.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RadiusMeshNode,
      RadiusMeshEvent,
      Tenant,
    ]),
  ],
  controllers: [RadiusMeshController],
  providers: [RadiusMeshService],
  exports: [RadiusMeshService],
})
export class RadiusMeshModule {}
