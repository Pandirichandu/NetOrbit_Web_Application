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
import { RadiusMeshService } from './radius-mesh.service';
import {
  RegisterMeshNodeDto,
  UpdateMeshNodeDto,
  MeshHeartbeatDto,
  ForwardAuthRequestDto,
  ForwardAcctRequestDto,
  DispatchMeshCoaDto,
} from './dto/radius-mesh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Geo-Distributed RADIUS Mesh')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('radius-mesh')
export class RadiusMeshController {
  constructor(
    private readonly meshService: RadiusMeshService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async resolveTenantId(
    user: ICurrentUser,
    dtoTenantId?: string,
    headerTenantId?: string,
  ): Promise<string> {
    if (!user.isSuperAdmin) {
      if (!user.tenantId) throw new ForbiddenException('Tenant context is required');
      return user.tenantId;
    }
    if (headerTenantId) return headerTenantId;
    if (dtoTenantId) return dtoTenantId;
    if (user.tenantId) return user.tenantId;
    const defaultTenant = await this.tenantRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (defaultTenant) return defaultTenant.id;
    throw new ForbiddenException('Tenant context is required for RADIUS mesh operations');
  }

  @Post('nodes')
  @RequirePermissions('radius_mesh:create')
  @ApiOperation({ summary: 'Register a regional RADIUS proxy node' })
  async registerNode(
    @Body() dto: RegisterMeshNodeDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, dto.tenantId, headerTenantId);
    return this.meshService.registerNode(tenantId, dto);
  }

  @Get('nodes')
  @RequirePermissions('radius_mesh:read')
  @ApiOperation({ summary: 'List RADIUS mesh nodes with health and latency metrics' })
  async listNodes(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.meshService.listNodes(tenantId ?? null);
  }

  @Get('nodes/:id')
  @RequirePermissions('radius_mesh:read')
  @ApiOperation({ summary: 'Get details of a specific mesh node' })
  async getNode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.meshService.getNode(id, tenantId ?? null);
  }

  @Patch('nodes/:id')
  @RequirePermissions('radius_mesh:update')
  @ApiOperation({ summary: 'Update mesh node parameters and priority' })
  async updateNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeshNodeDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.meshService.updateNode(id, tenantId ?? null, dto);
  }

  @Delete('nodes/:id')
  @RequirePermissions('radius_mesh:manage')
  @ApiOperation({ summary: 'Decommission a mesh node' })
  async deleteNode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.meshService.deleteNode(id, tenantId ?? null);
  }

  @Post('nodes/:nodeId/heartbeat')
  @RequirePermissions('radius_mesh:update')
  @ApiOperation({ summary: 'Record node heartbeat with latency and load factors' })
  async recordHeartbeat(
    @Param('nodeId') nodeId: string,
    @Body() dto: MeshHeartbeatDto,
  ) {
    return this.meshService.recordHeartbeat(nodeId, dto);
  }

  @Post('proxy/auth')
  @RequirePermissions('radius_mesh:manage')
  @ApiOperation({ summary: 'Forward authentication request through geo-distributed mesh' })
  async forwardAuth(
    @Body() dto: ForwardAuthRequestDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, undefined, headerTenantId);
    return this.meshService.forwardAuthentication(tenantId, dto);
  }

  @Post('proxy/acct')
  @RequirePermissions('radius_mesh:manage')
  @ApiOperation({ summary: 'Forward accounting packet with deduplication and failover' })
  async forwardAcct(
    @Body() dto: ForwardAcctRequestDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, undefined, headerTenantId);
    return this.meshService.forwardAccounting(tenantId, dto);
  }

  @Post('proxy/coa')
  @RequirePermissions('radius_mesh:manage')
  @ApiOperation({ summary: 'Dispatch CoA/Disconnect-Request to edge proxy' })
  async dispatchCoa(
    @Body() dto: DispatchMeshCoaDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, undefined, headerTenantId);
    return this.meshService.dispatchMeshCoa(tenantId, dto);
  }

  @Get('events')
  @RequirePermissions('radius_mesh:read')
  @ApiOperation({ summary: 'List distributed mesh forwarding events' })
  async getEvents(
    @Query('nodeId') nodeId: string | undefined,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.meshService.getEvents(tenantId ?? null, nodeId);
  }
}
