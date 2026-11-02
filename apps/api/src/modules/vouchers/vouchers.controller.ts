import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { GenerateVouchersDto, RedeemVoucherDto, VoucherQueryDto } from './dto/vouchers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';

@ApiTags('Vouchers & Hotspot Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @RequirePermissions('vouchers:read')
  @ApiOperation({ summary: 'List voucher inventory with status and batch filters' })
  async findAll(@Query() query: VoucherQueryDto, @CurrentUser() user: ICurrentUser) {
    return this.vouchersService.findAll(query, user.tenantId, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('vouchers:read')
  @ApiOperation({ summary: 'Get voucher details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.vouchersService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('generate')
  @RequirePermissions('vouchers:create')
  @ApiOperation({ summary: 'Batch generate unique access vouchers' })
  async generate(@Body() dto: GenerateVouchersDto, @CurrentUser() user: ICurrentUser) {
    return this.vouchersService.generate(dto, user.tenantId!, user.id, user.email);
  }

  @Post('redeem')
  @RequirePermissions('vouchers:create')
  @ApiOperation({ summary: 'Redeem a voucher and activate validity' })
  async redeem(@Body() dto: RedeemVoucherDto, @CurrentUser() user: ICurrentUser) {
    return this.vouchersService.redeem(dto, user.tenantId!, user.id, user.email);
  }

  @Patch(':id/revoke')
  @RequirePermissions('vouchers:delete')
  @ApiOperation({ summary: 'Revoke and invalidate a voucher' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.vouchersService.revoke(id, user.tenantId!, user.id, user.email);
  }
}
