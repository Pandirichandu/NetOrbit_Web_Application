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
import { IpamService } from './ipam.service';
import { CreateIpPoolDto, AllocateIpDto, IpPoolQueryDto } from './dto/ipam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('IPAM (IP Address Management)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ipam')
export class IpamController {
  constructor(private readonly ipamService: IpamService) {}

  @Get('pools')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'List IP pools with usage stats and tenant isolation' })
  async findAllPools(@Query() query: IpPoolQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.ipamService.findAllPools(query, user.tenantId, user.isSuperAdmin);
  }

  @Get('pools/:id')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'Get IP pool details by ID' })
  async findPool(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.ipamService.findPool(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('pools')
  @RequirePermissions('network:create')
  @ApiOperation({ summary: 'Create a new IP pool with CIDR subnet validation' })
  async createPool(@Body() dto: CreateIpPoolDto, @CurrentUser() user: ICurrentUser) {
    return this.ipamService.createPool(dto, user.tenantId!, user.id, user.email);
  }

  @Get('pools/:id/allocations')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'List IP allocations for a pool' })
  async findAllocations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.ipamService.findAllocations(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('pools/:id/allocate')
  @RequirePermissions('network:update')
  @ApiOperation({ summary: 'Allocate or reserve an IP address from the pool' })
  async allocateIp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocateIpDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.ipamService.allocateIp(id, dto, user.tenantId!, user.id, user.email);
  }

  @Post('allocations/:id/release')
  @RequirePermissions('network:update')
  @ApiOperation({ summary: 'Release an allocated IP address back to the pool' })
  async releaseIp(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.ipamService.releaseIp(id, user.tenantId!, user.id, user.email);
  }
}
