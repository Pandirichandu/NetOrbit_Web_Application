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
import { DhcpService } from './dhcp.service';
import { CreateDhcpScopeDto, CreateStaticReservationDto, DhcpQueryDto } from './dto/dhcp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('DHCP Scopes & Leases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dhcp')
export class DhcpController {
  constructor(private readonly dhcpService: DhcpService) {}

  @Get('scopes')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'List all DHCP scopes in tenant' })
  async findAllScopes(@CurrentUser() user: ICurrentUser) {
    return this.dhcpService.findAllScopes(user.tenantId, user.isSuperAdmin);
  }

  @Get('scopes/:id')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'Get DHCP scope details by ID' })
  async findScope(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.dhcpService.findScope(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('scopes')
  @RequirePermissions('network:create')
  @ApiOperation({ summary: 'Create a new DHCP scope' })
  async createScope(@Body() dto: CreateDhcpScopeDto, @CurrentUser() user: ICurrentUser) {
    return this.dhcpService.createScope(dto, user.tenantId!, user.id, user.email);
  }

  @Get('leases')
  @RequirePermissions('network:read')
  @ApiOperation({ summary: 'List active and static DHCP leases' })
  async findAllLeases(@Query() query: DhcpQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.dhcpService.findAllLeases(query, user.tenantId, user.isSuperAdmin);
  }

  @Post('leases/static')
  @RequirePermissions('network:create')
  @ApiOperation({ summary: 'Create static MAC-to-IP reservation' })
  async createStaticReservation(
    @Body() dto: CreateStaticReservationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.dhcpService.createStaticReservation(dto, user.tenantId!, user.id, user.email);
  }

  @Post('leases/:id/release')
  @RequirePermissions('network:update')
  @ApiOperation({ summary: 'Release a DHCP lease' })
  async releaseLease(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.dhcpService.releaseLease(id, user.tenantId!, user.id, user.email);
  }
}
