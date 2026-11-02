import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, RechargeDto, InvoiceQueryDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../subscribers/entities/subscriber.entity';

@ApiTags('Billing & Invoicing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
  ) {}

  @Get('invoices')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'List invoices with tenant isolation and filtering' })
  async findAll(@Query() query: InvoiceQueryDto, @CurrentUser() user: ICurrentUser) {
    let subscriberFilter: string | undefined = undefined;

    // If caller is purely a customer, isolate to their own subscriber account
    if (user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator')) {
      const sub = await this.subscriberRepo.findOne({
        where: { userId: user.id },
      });
      subscriberFilter = sub ? sub.id : '00000000-0000-0000-0000-000000000000';
    }

    return this.billingService.findAll(query, user.tenantId, user.isSuperAdmin, subscriberFilter);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.billingService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('invoices')
  @RequirePermissions('billing:create')
  @ApiOperation({ summary: 'Generate a new invoice' })
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: ICurrentUser) {
    return this.billingService.create(dto, user.tenantId!, user.id, user.email);
  }

  @Post('invoices/:id/void')
  @RequirePermissions('billing:delete')
  @ApiOperation({ summary: 'Void an unpaid invoice' })
  async voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.billingService.voidInvoice(id, user.tenantId!, user.id, user.email);
  }

  @Post('recharge')
  @RequirePermissions('billing:create')
  @ApiOperation({ summary: 'Recharge a subscriber account with a package' })
  async recharge(@Body() dto: RechargeDto, @CurrentUser() user: ICurrentUser) {
    return this.billingService.recharge(dto, user.tenantId!, user.id, user.email);
  }
}
