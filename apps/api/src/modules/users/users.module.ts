import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PasswordHistory } from '../auth/entities/password-history.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmailService } from '../auth/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Tenant, PasswordHistory])],
  controllers: [UsersController],
  providers: [UsersService, EmailService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
