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
import { NasService } from './nas.service';
import { CreateNasDto, UpdateNasDto, NasQueryDto } from './dto/nas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('NAS Devices & Gateways')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('nas')
export class NasController {
  constructor(private readonly nasService: NasService) {}

  @Get()
  @RequirePermissions('nas:read')
  @ApiOperation({ summary: 'List NAS devices with tenant isolation and filtering' })
  async findAll(@Query() query: NasQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.nasService.findAll(query, user.tenantId, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('nas:read')
  @ApiOperation({ summary: 'Get NAS device details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.findOne(id, user.tenantId, user.isSuperAdmin, false);
  }

  @Post()
  @RequirePermissions('nas:create')
  @ApiOperation({ summary: 'Register a new NAS gateway device' })
  async create(@Body() dto: CreateNasDto, @CurrentUser() user: ICurrentUser) {
    return this.nasService.create(dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id')
  @RequirePermissions('nas:update')
  @ApiOperation({ summary: 'Update NAS device settings' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNasDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.update(id, dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Put(':id')
  @RequirePermissions('nas:update')
  @ApiOperation({ summary: 'Update NAS device settings (PUT)' })
  async updatePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNasDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.update(id, dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id/status')
  @RequirePermissions('nas:update')
  @ApiOperation({ summary: 'Toggle NAS device active/inactive status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.toggleStatus(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Delete(':id')
  @RequirePermissions('nas:delete')
  @ApiOperation({ summary: 'Deactivate / Delete NAS device' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    await this.nasService.remove(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
    return { success: true, message: 'NAS device removed successfully' };
  }

  @Post(':id/test-connection')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('nas:read')
  @ApiOperation({ summary: 'Probe NAS device connectivity' })
  async testConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.testConnection(id, user.tenantId, user.isSuperAdmin);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('nas:read')
  @ApiOperation({ summary: 'Probe NAS device connectivity (alias)' })
  async testConnectionAlias(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.nasService.testConnection(id, user.tenantId, user.isSuperAdmin);
  }
}
