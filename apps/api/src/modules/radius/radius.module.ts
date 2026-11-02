import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiusUser } from './entities/radius-user.entity';
import { RadiusAccounting } from './entities/radius-accounting.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { RadiusService } from './radius.service';
import { RadiusController } from './radius.controller';
import { AuditModule } from '../../core/audit/audit.module';
import { NasModule } from '../nas/nas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RadiusUser, RadiusAccounting, NasDevice, Subscriber, Package]),
    AuditModule,
    NasModule,
  ],
  controllers: [RadiusController],
  providers: [RadiusService],
  exports: [RadiusService],
})
export class RadiusModule {}
