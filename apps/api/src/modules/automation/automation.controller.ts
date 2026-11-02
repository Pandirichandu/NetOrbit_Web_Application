import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto } from './dto/automation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Automation & Schedulers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async resolveTenantId(
    user: ICurrentUser,
    dtoTenantId?: string,
    headerTenantId?: string,
    headerSlug?: string,
  ): Promise<string> {
    if (!user.isSuperAdmin) {
      if (!user.tenantId) throw new ForbiddenException('Tenant context is required');
      return user.tenantId;
    }
    if (headerTenantId) return headerTenantId;
    if (dtoTenantId) return dtoTenantId;
    if (user.tenantId) return user.tenantId;
    if (headerSlug) {
      const t = await this.tenantRepo.findOne({ where: { slug: headerSlug } });
      if (t) return t.id;
    }
    const defaultTenant = await this.tenantRepo.findOne({ order: { createdAt: 'ASC' } });
    if (defaultTenant) return defaultTenant.id;
    throw new ForbiddenException('Tenant context is required');
  }

  @Get('rules')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List automation rules and executions' })
  async findAllRules(
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
    return this.automationService.findAllRules(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('rules')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Create new automation rule' })
  async createRule(
    @Body() dto: CreateAutomationRuleDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    const tenantId = await this.resolveTenantId(
      user,
      (dto as any).tenantId,
      headerTenantId,
      headerTenantSlug,
    );
    return this.automationService.createRule(dto, tenantId);
  }

  @Patch('rules/:id/toggle')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Toggle automation rule status' })
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
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
    return this.automationService.toggleRule(
      id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('sweep/expiry')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Trigger manual Plan Expiry Sweep with CoA session termination' })
  async triggerExpirySweep(
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
    return this.automationService.runExpirySweep(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('sweep/overdue')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Trigger manual Overdue Invoice Sweep with reminder alerts' })
  async triggerOverdueSweep(
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
    return this.automationService.runOverdueSweep(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }
}
