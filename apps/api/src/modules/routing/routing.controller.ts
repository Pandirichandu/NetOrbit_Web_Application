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
import { RoutingService } from './routing.service';
import {
  CreateBgpPeerDto,
  UpdateBgpPeerDto,
  CreateOspfProcessDto,
  UpdateOspfProcessDto,
  AddOspfNeighborDto,
  ValidateConfigRequestDto,
  DeployConfigRequestDto,
  RollbackConfigRequestDto,
} from './dto/routing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('BGP & OSPF Routing Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('routing')
export class RoutingController {
  constructor(
    private readonly routingService: RoutingService,
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
    throw new ForbiddenException('Tenant context is required for routing operations');
  }

  // --- BGP PEERS ---

  @Post('bgp/peers')
  @RequirePermissions('routing:create')
  @ApiOperation({ summary: 'Create a BGP peer with encrypted MD5 credentials' })
  async createBgpPeer(
    @Body() dto: CreateBgpPeerDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, dto.tenantId, headerTenantId);
    return this.routingService.createBgpPeer(tenantId, dto);
  }

  @Get('bgp/peers')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'List BGP peers with status and prefix statistics' })
  async listBgpPeers(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.listBgpPeers(tenantId ?? null);
  }

  @Get('bgp/peers/:id')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'Get details of a specific BGP peer' })
  async getBgpPeer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.getBgpPeer(id, tenantId ?? null);
  }

  @Patch('bgp/peers/:id')
  @RequirePermissions('routing:update')
  @ApiOperation({ summary: 'Update BGP peer parameters' })
  async updateBgpPeer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBgpPeerDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.updateBgpPeer(id, tenantId ?? null, dto);
  }

  @Delete('bgp/peers/:id')
  @RequirePermissions('routing:delete')
  @ApiOperation({ summary: 'Decommission a BGP peer' })
  async deleteBgpPeer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.deleteBgpPeer(id, tenantId ?? null);
  }

  // --- OSPF PROCESSES ---

  @Post('ospf/processes')
  @RequirePermissions('routing:create')
  @ApiOperation({ summary: 'Create an OSPF routing process' })
  async createOspfProcess(
    @Body() dto: CreateOspfProcessDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, dto.tenantId, headerTenantId);
    return this.routingService.createOspfProcess(tenantId, dto);
  }

  @Get('ospf/processes')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'List OSPF processes and adjacent neighbors' })
  async listOspfProcesses(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.listOspfProcesses(tenantId ?? null);
  }

  @Get('ospf/processes/:id')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'Get details of an OSPF process' })
  async getOspfProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.getOspfProcess(id, tenantId ?? null);
  }

  @Patch('ospf/processes/:id')
  @RequirePermissions('routing:update')
  @ApiOperation({ summary: 'Update OSPF process attributes' })
  async updateOspfProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOspfProcessDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.updateOspfProcess(id, tenantId ?? null, dto);
  }

  @Delete('ospf/processes/:id')
  @RequirePermissions('routing:delete')
  @ApiOperation({ summary: 'Remove an OSPF process' })
  async deleteOspfProcess(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.deleteOspfProcess(id, tenantId ?? null);
  }

  @Post('ospf/processes/:id/neighbors')
  @RequirePermissions('routing:create')
  @ApiOperation({ summary: 'Add an OSPF neighbor adjacently' })
  async addOspfNeighbor(
    @Param('id', ParseUUIDPipe) processId: string,
    @Body() dto: AddOspfNeighborDto,
  ) {
    return this.routingService.addOspfNeighbor(processId, dto);
  }

  @Delete('ospf/neighbors/:id')
  @RequirePermissions('routing:delete')
  @ApiOperation({ summary: 'Remove an OSPF neighbor' })
  async deleteOspfNeighbor(@Param('id', ParseUUIDPipe) neighborId: string) {
    return this.routingService.deleteOspfNeighbor(neighborId);
  }

  // --- CONFIG VALIDATION, DEPLOYMENT & ROLLBACK ---

  @Post('config/validate')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'Validate routing syntax using vendor adapter (Dry-run)' })
  async validateConfig(@Body() dto: ValidateConfigRequestDto) {
    return this.routingService.validateConfig(dto);
  }

  @Post('config/deploy')
  @RequirePermissions('routing:deploy')
  @ApiOperation({ summary: 'Deploy routing configuration with audit diff & confirmation' })
  async deployConfig(
    @Body() dto: DeployConfigRequestDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, undefined, headerTenantId);
    return this.routingService.deployConfig(tenantId, user.email || 'operator', dto);
  }

  @Post('config/rollback')
  @RequirePermissions('routing:deploy')
  @ApiOperation({ summary: 'Roll back to a previous routing configuration revision' })
  async rollbackConfig(
    @Body() dto: RollbackConfigRequestDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = await this.resolveTenantId(user, undefined, headerTenantId);
    return this.routingService.rollbackConfig(tenantId, user.email || 'operator', dto);
  }

  @Get('config/revisions')
  @RequirePermissions('routing:read')
  @ApiOperation({ summary: 'View revision history and configuration diffs' })
  async getRevisions(
    @Query('deviceId') deviceId: string | undefined,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
  ) {
    const tenantId = user.isSuperAdmin ? (headerTenantId || user.tenantId) : user.tenantId;
    return this.routingService.getRevisions(tenantId ?? null, deviceId);
  }
}
