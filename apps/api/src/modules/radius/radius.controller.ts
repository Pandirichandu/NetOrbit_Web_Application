import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RadiusService } from './radius.service';
import {
  CreateRadiusUserDto,
  UpdateRadiusUserDto,
  RadiusUserQueryDto,
  RadiusUserStatusDto,
  RadiusAuthRequestDto,
  RadiusAcctRequestDto,
  RadiusDisconnectDto,
  SessionQueryDto,
} from './dto/radius.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('RADIUS / AAA & Sessions')
@Controller('radius')
export class RadiusController {
  constructor(private readonly radiusService: RadiusService) {}

  // ----------------------------------------------------
  // AAA Protocol Endpoints (RFC 2865, RFC 2866)
  // Publicly callable by NAS or FreeRADIUS rlm_rest module
  // ----------------------------------------------------

  @Public()
  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RFC 2865 RADIUS Access-Request handler (PAP, CHAP, MSCHAPv2)' })
  async authenticate(@Body() dto: RadiusAuthRequestDto) {
    return this.radiusService.authenticate(dto);
  }

  @Public()
  @Post('auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RFC 2865 RADIUS Access-Request handler (alias)' })
  async authAlias(@Body() dto: RadiusAuthRequestDto) {
    return this.radiusService.authenticate(dto);
  }

  @Public()
  @Post('accounting')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RFC 2866 RADIUS Accounting-Request handler (Start, Interim, Stop)' })
  async accounting(@Body() dto: RadiusAcctRequestDto) {
    return this.radiusService.processAccounting(dto);
  }

  // ----------------------------------------------------
  // Administrative Operations (Secured by JWT + RBAC)
  // ----------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('overview')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'Get real-time RADIUS overview stats (active sessions, users, throughput)' })
  async getOverview(@CurrentUser() user: ICurrentUser) {
    return this.radiusService.getOverviewStats(user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('stats')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'Get real-time RADIUS overview stats (alias)' })
  async getStatsAlias(@CurrentUser() user: ICurrentUser) {
    return this.radiusService.getOverviewStats(user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('users')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'List RADIUS users with subscriber/package links' })
  async findAllUsers(@Query() query: RadiusUserQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.radiusService.findAllRadiusUsers(query, user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('users/:id')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'Get RADIUS user details by ID' })
  async findOneUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ICurrentUser) {
    return this.radiusService.findOneRadiusUser(id, user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('users')
  @RequirePermissions('radius:create')
  @ApiOperation({ summary: 'Create and configure a new RADIUS user' })
  async createUser(@Body() dto: CreateRadiusUserDto, @CurrentUser() user: ICurrentUser) {
    return this.radiusService.createRadiusUser(
      dto,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('users/:id')
  @RequirePermissions('radius:update')
  @ApiOperation({ summary: 'Update RADIUS user credentials and profiles' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRadiusUserDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.radiusService.updateRadiusUser(
      id,
      dto,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('users/:id')
  @RequirePermissions('radius:update')
  @ApiOperation({ summary: 'Update RADIUS user credentials and profiles (PUT)' })
  async updateUserPut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRadiusUserDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.radiusService.updateRadiusUser(
      id,
      dto,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('users/:id/status')
  @RequirePermissions('radius:update')
  @ApiOperation({ summary: 'Toggle RADIUS user active/disabled status' })
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RadiusUserStatusDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.radiusService.toggleRadiusUserStatus(
      id,
      body?.status,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('users/:id')
  @RequirePermissions('radius:delete')
  @ApiOperation({ summary: 'Remove / Deactivate RADIUS user' })
  async removeUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ICurrentUser) {
    await this.radiusService.removeRadiusUser(
      id,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
    return { success: true, message: 'RADIUS user removed successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('sessions')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'List currently active broadband/hotspot sessions' })
  async findActiveSessions(@Query() query: SessionQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.radiusService.findActiveSessions(query, user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('accounting')
  @RequirePermissions('radius:read')
  @ApiOperation({ summary: 'Query historical RADIUS accounting and session logs' })
  async findAccountingHistory(@Query() query: SessionQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.radiusService.findAccountingHistory(query, user.tenantId, user.isSuperAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('sessions/:sessionId/disconnect')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('radius:disconnect')
  @ApiOperation({ summary: 'RFC 3576 Disconnect-Request (terminates active session)' })
  async disconnectSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: RadiusDisconnectDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.radiusService.disconnectSession(
      sessionId,
      dto,
      user.tenantId,
      user.id,
      user.email,
      user.isSuperAdmin,
    );
  }
}

