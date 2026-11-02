import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { Installation } from './entities/installation.entity';
import { Technician } from './entities/technician.entity';
import { Complaint } from './entities/complaint.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Installation,
      Technician,
      Complaint,
      Subscriber,
      Package,
      Tenant,
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
