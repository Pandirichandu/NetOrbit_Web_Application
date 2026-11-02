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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  InviteUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/users.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser as ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in current tenant scope' })
  async findAll(
    @Query() query: PaginationDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.findAll(query, user.tenantId, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create user manually' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.create(dto, user.tenantId, user.id);
  }

  @Post('invite')
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Invite user via email with temporary password' })
  async invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.invite(dto, user.tenantId, user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update logged in user profile' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change logged in user password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Put(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user properties and assigned roles' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.update(id, dto, user.tenantId, user.id, user.isSuperAdmin);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Deactivate user account' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.deactivate(id, user.tenantId, user.id);
  }

  @Patch(':id/reactivate')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Reactivate user account' })
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.usersService.reactivate(id, user.tenantId, user.id);
  }
}
