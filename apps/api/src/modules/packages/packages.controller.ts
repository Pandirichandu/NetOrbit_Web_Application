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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto, PackageFilterDto } from './dto/packages.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser as ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'packages', version: '1' })
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @RequirePermissions('packages:read')
  @ApiOperation({ summary: 'List all ISP packages in current tenant scope' })
  async findAll(
    @Query() filter: PackageFilterDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.findAll(filter, user.tenantId, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('packages:read')
  @ApiOperation({ summary: 'Get package details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions('packages:create')
  @ApiOperation({ summary: 'Create a new internet service package' })
  async create(
    @Body() dto: CreatePackageDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.create(dto, user.tenantId, user.id, user.email);
  }

  @Put(':id')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Update an existing service package' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.update(id, dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id/activate')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Activate a service package' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.activate(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('packages:update')
  @ApiOperation({ summary: 'Deactivate a service package' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.deactivate(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('packages:delete')
  @ApiOperation({ summary: 'Delete/retire a service package' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.packagesService.remove(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }
}
