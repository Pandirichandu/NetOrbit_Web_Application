import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CaptiveService } from './captive.service';
import { CaptiveAuthDto } from './dto/captive.dto';

@ApiTags('Captive Portal & Hotspot')
@Controller('captive')
export class CaptiveController {
  constructor(private readonly captiveService: CaptiveService) {}

  @Get('portal/:tenantSlug')
  @ApiOperation({ summary: 'Get public captive portal configuration for a tenant' })
  async getPortalConfig(@Param('tenantSlug') tenantSlug: string) {
    return this.captiveService.getTenantPortalConfig(tenantSlug);
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate hotspot user via voucher or subscriber credentials' })
  async authenticate(
    @Body() dto: CaptiveAuthDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.captiveService.authenticate(dto, clientIp, userAgent);
  }
}
