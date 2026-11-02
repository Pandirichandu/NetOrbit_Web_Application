import {
  Controller,
  Get,
  Param,
  Res,
  Headers,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Executive Analytics & Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly reportsService: ReportsService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get('dashboard')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'Get Executive Dashboard KPIs (MRR, ARPU, Subscribers, Churn, Active Sessions)' })
  async getDashboardKpis(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.reportsService.getDashboardKpis(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }
}

@ApiTags('Executive Analytics & Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get('revenue')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Get Revenue Trends, Payment Reconciliation, and Aging Receivables' })
  async getRevenueReports(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.reportsService.getRevenueReports(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Get('bandwidth')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'Get Bandwidth Analytics, Top Consumers, and Package Usage' })
  async getBandwidthReports(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.reportsService.getBandwidthAnalytics(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Get('export/:type')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'Export Subscribers, Invoices, Payments, or Tickets as CSV' })
  async exportCsv(
    @Param('type') type: string,
    @CurrentUser() user: ICurrentUser,
    @Res() res: Response,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    const csvData = await this.reportsService.exportCsv(
      type,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
    res.status(200).send(csvData);
  }
}
