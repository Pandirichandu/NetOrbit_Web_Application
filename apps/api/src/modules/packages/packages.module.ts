import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './entities/package.entity';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Package]), AuditModule],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
