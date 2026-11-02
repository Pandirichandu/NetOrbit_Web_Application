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
import { CrmService } from './crm.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  CreateInstallationDto,
  UpdateInstallationDto,
  CreateTechnicianDto,
  CreateComplaintDto,
} from './dto/crm.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('CRM & Field Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
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

  @Get('overview')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'Get CRM summary overview' })
  async getOverview(
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
    return this.crmService.getOverview(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  // --- Leads ---
  @Get('leads')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'List CRM leads' })
  async findAllLeads(
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
    return this.crmService.findAllLeads(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('leads')
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: 'Create new prospect lead' })
  async createLead(
    @Body() dto: CreateLeadDto,
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
    return this.crmService.createLead(dto, tenantId);
  }

  @Patch('leads/:id')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Update lead qualification status or notes' })
  async updateLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.crmService.updateLead(id, dto, user.tenantId, user.isSuperAdmin);
  }

  @Post('leads/:id/convert')
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: '1-Click convert qualified lead to registered subscriber' })
  async convertLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.crmService.convertLead(id, dto, user.tenantId, user.isSuperAdmin);
  }

  // --- Installations ---
  @Get('installations')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'List installation work orders' })
  async findAllInstallations(
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
    return this.crmService.findAllInstallations(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('installations')
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: 'Schedule installation work order' })
  async createInstallation(
    @Body() dto: CreateInstallationDto,
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
    return this.crmService.createInstallation(dto, tenantId);
  }

  @Patch('installations/:id')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Update installation status or technician' })
  async updateInstallation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstallationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.crmService.updateInstallation(id, dto, user.tenantId, user.isSuperAdmin);
  }

  // --- Technicians ---
  @Get('technicians')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'List field technicians' })
  async findAllTechnicians(
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
    return this.crmService.findAllTechnicians(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('technicians')
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: 'Register field technician' })
  async createTechnician(
    @Body() dto: CreateTechnicianDto,
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
    return this.crmService.createTechnician(dto, tenantId);
  }

  // --- Complaints ---
  @Get('complaints')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'List subscriber complaints' })
  async findAllComplaints(
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
    return this.crmService.findAllComplaints(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post('complaints')
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: 'Log connectivity or speed complaint' })
  async createComplaint(
    @Body() dto: CreateComplaintDto,
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
    return this.crmService.createComplaint(dto, tenantId);
  }
}
