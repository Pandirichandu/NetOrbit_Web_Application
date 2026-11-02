import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateCommentDto,
  TicketQueryDto,
} from './dto/tickets.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Helpdesk & Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
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
    throw new ForbiddenException('Tenant context is required to create a ticket');
  }

  @Get()
  @RequirePermissions('tickets:read')
  @ApiOperation({ summary: 'List tickets with tenant isolation and SLA tracking' })
  async findAll(
    @Query() query: TicketQueryDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    let subscriberFilter: string | undefined = undefined;

    // Customer role: scope strictly to own subscriber record
    if (user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator')) {
      const sub = await this.subscriberRepo.findOne({
        where: { userId: user.id },
      });
      subscriberFilter = sub ? sub.id : '00000000-0000-0000-0000-000000000000';
    }

    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }

    return this.ticketsService.findAll(
      query,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
      subscriberFilter,
    );
  }

  @Get(':id')
  @RequirePermissions('tickets:read')
  @ApiOperation({ summary: 'Get ticket details and comments thread' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    const isCustomer = user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator');
    let callerSubId: string | undefined;

    if (isCustomer) {
      const sub = await this.subscriberRepo.findOne({ where: { userId: user.id } });
      callerSubId = sub ? sub.id : '00000000-0000-0000-0000-000000000000';
    }

    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }

    return this.ticketsService.findOne(
      id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
      isCustomer,
      callerSubId,
    );
  }

  @Post()
  @RequirePermissions('tickets:create')
  @ApiOperation({ summary: 'Create support ticket' })
  async create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    const isCustomer = user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator');
    let subId = dto.subscriberId;

    if (isCustomer) {
      const sub = await this.subscriberRepo.findOne({ where: { userId: user.id } });
      if (!sub) {
        throw new ForbiddenException('Subscriber profile not found for this customer account');
      }
      subId = sub.id;
    }

    const tenantId = await this.resolveTenantId(
      user,
      (dto as any).tenantId,
      headerTenantId,
      headerTenantSlug,
    );

    return this.ticketsService.create(dto, tenantId, user.id, subId);
  }

  @Patch(':id')
  @RequirePermissions('tickets:update')
  @ApiOperation({ summary: 'Update ticket status, priority or assignee' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    if (user.roles.includes('customer') && !user.isSuperAdmin) {
      throw new ForbiddenException('Customers cannot directly alter ticket metadata or assignment');
    }

    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }

    return this.ticketsService.update(
      id,
      dto,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
    );
  }

  @Post(':id/comments')
  @RequirePermissions('tickets:update')
  @ApiOperation({ summary: 'Add a comment or internal note to ticket thread' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ICurrentUser,
    @Headers('x-tenant-id') headerTenantId?: string,
    @Headers('x-tenant-slug') headerTenantSlug?: string,
  ) {
    const isCustomer = user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator');
    let callerSubId: string | undefined;

    if (isCustomer) {
      const sub = await this.subscriberRepo.findOne({ where: { userId: user.id } });
      callerSubId = sub ? sub.id : '00000000-0000-0000-0000-000000000000';
    }

    let tenantId = user.tenantId;
    if (user.isSuperAdmin && !tenantId) {
      if (headerTenantId) tenantId = headerTenantId;
      else if (headerTenantSlug) {
        const t = await this.tenantRepo.findOne({ where: { slug: headerTenantSlug } });
        if (t) tenantId = t.id;
      }
    }

    return this.ticketsService.addComment(
      id,
      dto,
      user.id,
      tenantId,
      user.isSuperAdmin && !headerTenantSlug && !headerTenantId,
      isCustomer,
      callerSubId,
    );
  }
}
