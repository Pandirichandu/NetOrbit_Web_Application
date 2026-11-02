import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser as ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions('tenants:read')
  @ApiOperation({ summary: 'List all ISP tenants with pagination (Super Admin)' })
  async findAll(@Query() query: PaginationDto) {
    return this.tenantsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('tenants:read')
  @ApiOperation({ summary: 'Get tenant details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @RequirePermissions('tenants:create')
  @ApiOperation({ summary: 'Onboard a new ISP tenant and bootstrap tenant administrator' })
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.tenantsService.create(dto, user.id);
  }

  @Put(':id')
  @RequirePermissions('tenants:update')
  @ApiOperation({ summary: 'Update tenant parameters and branding configuration' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.tenantsService.update(id, dto, user.id);
  }

  @Patch(':id/suspend')
  @RequirePermissions('tenants:update')
  @ApiOperation({ summary: 'Suspend tenant operations' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.tenantsService.suspend(id, user.id);
  }

  @Patch(':id/activate')
  @RequirePermissions('tenants:update')
  @ApiOperation({ summary: 'Activate tenant operations' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.tenantsService.activate(id, user.id);
  }
}
