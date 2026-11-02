import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/webhooks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Developer Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async resolveTenantId(
    user: ICurrentUser,
    dtoTenantId?: string,
    headerTenantId?: string,
    headerSlug?: string,
  ): Promise<string> {
    if (!user.isSuperAdmin) {
      if (!user.tenantId) throw new ForbiddenException('Tenant context is required');
      return user.tenantId;
    }
    if (headerTenantId) return headerTenantId;
    if (dtoTenantId) return dtoTenantId;
    if (user.tenantId) return user.tenantId;
    if (headerSlug) {
      const t = await this.tenantRepo.findOne({ where: { slug: headerSlug } });
      if (t) return t.id;
    }
    const defaultTenant = await this.tenantRepo.findOne({ order: { createdAt: 'ASC' } });
    if (defaultTenant) return defaultTenant.id;
    throw new ForbiddenException('Tenant context is required to register a webhook');
  }

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all tenant outbound webhooks' })
  async findAll(
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.webhooksService.findAll(
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post()
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Register new developer webhook endpoint' })
  async create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    const tenantId = await this.resolveTenantId(
      user,
      (dto as any).tenantId,
      headerTenantId,
      headerTenantSlug,
    );
    return this.webhooksService.create(dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Remove a developer webhook' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.webhooksService.delete(
      id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post(':id/test')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Trigger a signed test ping delivery' })
  async testDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.webhooksService.testDelivery(
      id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Get(':id/events')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get delivery history and retry logs for a webhook' })
  async getEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }
    return this.webhooksService.getEvents(
      id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }
}
