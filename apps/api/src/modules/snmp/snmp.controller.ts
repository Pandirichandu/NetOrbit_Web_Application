import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SnmpService } from './snmp.service';
import {
  RegisterSnmpDeviceDto,
  UpdateSnmpDeviceDto,
  DiscoverNetworkDto,
  CreateTopologyLinkDto,
} from './dto/snmp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('SNMP & Topology Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('snmp')
export class SnmpController {
  constructor(
    private readonly snmpService: SnmpService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async resolveTenantId(
    user: ICurrentUser,
    headerTenantId?: string,
    headerSlug?: string,
  ): Promise<string> {
    if (!user.isSuperAdmin) {
      if (!user.tenantId) throw new ForbiddenException('Tenant context is required');
      return user.tenantId;
    }
    if (headerTenantId) return headerTenantId;
    if (user.tenantId) return user.tenantId;
    if (headerSlug) {
      const t = await this.tenantRepo.findOne({ where: { slug: headerSlug } });
      if (t) return t.id;
    }
    const defaultTenant = await this.tenantRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (defaultTenant) return defaultTenant.id;
    throw new ForbiddenException('Tenant context is required for SNMP operations');
  }

  @Post('devices')
  @RequirePermissions('snmp:create')
  @ApiOperation({ summary: 'Register an SNMP device with encrypted credentials' })
  async createDevice(
    @Body() dto: RegisterSnmpDeviceDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerSlug?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, headerTenantId, headerSlug);
    return this.snmpService.registerDevice(dto, tenantId);
  }

  @Get('devices')
  @RequirePermissions('snmp:read')
  @ApiOperation({ summary: 'List SNMP devices with tenant isolation' })
  async listDevices(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.findAllDevices(tenantId ?? null, user.isSuperAdmin);
  }

  @Get('devices/:id')
  @RequirePermissions('snmp:read')
  @ApiOperation({ summary: 'Get device details and interfaces' })
  async getDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.findOneDevice(id, tenantId ?? null, user.isSuperAdmin);
  }

  @Patch('devices/:id')
  @RequirePermissions('snmp:update')
  @ApiOperation({ summary: 'Update SNMP device parameters' })
  async updateDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSnmpDeviceDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.updateDevice(id, dto, tenantId ?? null, user.isSuperAdmin);
  }

  @Delete('devices/:id')
  @RequirePermissions('snmp:delete')
  @ApiOperation({ summary: 'Remove SNMP device from monitoring' })
  async deleteDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.deleteDevice(id, tenantId ?? null, user.isSuperAdmin);
  }

  @Post('devices/:id/poll')
  @RequirePermissions('snmp:update')
  @ApiOperation({ summary: 'Execute an on-demand SNMP poll' })
  async pollDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.pollDevice(id, tenantId ?? null, user.isSuperAdmin);
  }

  @Get('devices/:id/logs')
  @RequirePermissions('snmp:read')
  @ApiOperation({ summary: 'Get SNMP polling logs and performance history' })
  async getPollLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.getPollLogs(id, tenantId ?? null);
  }

  @Get('interfaces')
  @RequirePermissions('snmp:read')
  @ApiOperation({ summary: 'List discovered network interfaces' })
  async listInterfaces(
    @Query('deviceId') deviceId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.listInterfaces(tenantId ?? null, deviceId, status);
  }

  @Get('topology')
  @RequirePermissions('snmp:read')
  @ApiOperation({ summary: 'Get verifiable topology graph (nodes and links)' })
  async getTopology(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.getTopology(tenantId ?? null, user.isSuperAdmin);
  }

  @Post('topology/links')
  @RequirePermissions('snmp:create')
  @ApiOperation({ summary: 'Create a network topology link' })
  async createTopologyLink(
    @Body() dto: CreateTopologyLinkDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, headerTenantId);
    return this.snmpService.createTopologyLink(dto, tenantId);
  }

  @Delete('topology/links/:id')
  @RequirePermissions('snmp:delete')
  @ApiOperation({ summary: 'Delete a network topology link' })
  async deleteTopologyLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.snmpService.deleteTopologyLink(id, tenantId ?? null);
  }

  @Post('discover')
  @RequirePermissions('snmp:create')
  @ApiOperation({ summary: 'Run an anti-SSRF validated SNMP discovery sweep' })
  async discoverNetwork(
    @Body() dto: DiscoverNetworkDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, headerTenantId);
    return this.snmpService.discoverNetwork(dto, tenantId);
  }
}
