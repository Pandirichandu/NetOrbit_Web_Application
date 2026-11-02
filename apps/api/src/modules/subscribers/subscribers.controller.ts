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
import { SubscribersService } from './subscribers.service';
import {
  CreateSubscriberDto,
  UpdateSubscriberDto,
  UpdateSubscriberStatusDto,
  ChangeSubscriberPackageDto,
  SubscriberFilterDto,
} from './dto/subscribers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser as ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('subscribers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'subscribers', version: '1' })
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Get()
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'List all subscribers in current tenant scope' })
  async findAll(
    @Query() filter: SubscriberFilterDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.findAll(filter, user.tenantId, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('subscribers:read')
  @ApiOperation({ summary: 'Get subscriber details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions('subscribers:create')
  @ApiOperation({ summary: 'Register a new ISP subscriber' })
  async create(
    @Body() dto: CreateSubscriberDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.create(dto, user.tenantId, user.id, user.email);
  }

  @Put(':id')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Update subscriber profile and details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriberDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.update(id, dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id/status')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Change subscriber status (activate, suspend, terminate)' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriberStatusDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.changeStatus(id, dto, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Patch(':id/package')
  @RequirePermissions('subscribers:update')
  @ApiOperation({ summary: 'Change or upgrade/downgrade assigned package' })
  async changePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSubscriberPackageDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.changePackage(id, dto.packageId, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('subscribers:delete')
  @ApiOperation({ summary: 'Terminate and delete subscriber record' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.subscribersService.remove(id, user.tenantId, user.id, user.email, user.isSuperAdmin);
  }
}
