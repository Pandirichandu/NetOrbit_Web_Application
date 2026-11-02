import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NasDevice } from './entities/nas-device.entity';
import { NasService } from './nas.service';
import { NasController } from './nas.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([NasDevice]), AuditModule],
  controllers: [NasController],
  providers: [NasService],
  exports: [NasService],
})
export class NasModule {}
