import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Tenant, TenantStatus, TenantPlan } from './entities/tenant.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenants.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.tenantRepo.createQueryBuilder('tenant');

    if (pagination.search) {
      qb.where('tenant.name ILIKE :search OR tenant.slug ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    qb.orderBy('tenant.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug } });
  }

  async create(dto: CreateTenantDto, actorUserId?: string): Promise<Tenant> {
    const cleanSlug = dto.slug.trim().toLowerCase();
    const existing = await this.findBySlug(cleanSlug);
    if (existing) {
      throw new ConflictException(`Tenant slug '${cleanSlug}' is already taken`);
    }

    const tenant = this.tenantRepo.create({
      name: dto.name,
      slug: cleanSlug,
      plan: dto.plan || TenantPlan.TRIAL,
      status: TenantStatus.ACTIVE,
      config: dto.config,
    });

    const savedTenant = await this.tenantRepo.save(tenant);

    // Find the SRS tenant_administrator role
    const tenantAdminRole = await this.roleRepo.findOne({
      where: { slug: 'tenant_administrator', isSystem: true },
    });

    const passwordToHash = dto.adminPassword || 'NetOrbit@Tenant2026';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);

    const adminUser = this.userRepo.create({
      email: dto.adminEmail.toLowerCase(),
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      passwordHash,
      tenantId: savedTenant.id,
      isSuperAdmin: false,
      status: UserStatus.ACTIVE,
      roles: tenantAdminRole ? [tenantAdminRole] : [],
      forcePasswordChange: !dto.adminPassword,
    });

    await this.userRepo.save(adminUser);

    await this.auditService.log({
      tenantId: savedTenant.id,
      userId: actorUserId,
      action: 'tenant.create',
      resourceType: 'tenant',
      resourceId: savedTenant.id,
      details: { name: savedTenant.name, slug: savedTenant.slug, adminEmail: dto.adminEmail },
    });

    this.logger.log(`Tenant '${savedTenant.name}' (${savedTenant.slug}) created with admin ${dto.adminEmail}`);
    return savedTenant;
  }

  async update(id: string, dto: UpdateTenantDto, actorUserId?: string): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (dto.name) tenant.name = dto.name;
    if (dto.plan) tenant.plan = dto.plan;
    if (dto.status) tenant.status = dto.status;
    if (dto.customDomain !== undefined) tenant.customDomain = dto.customDomain;
    if (dto.config) tenant.config = { ...tenant.config, ...dto.config };

    const updated = await this.tenantRepo.save(tenant);

    await this.auditService.log({
      tenantId: id,
      userId: actorUserId,
      action: 'tenant.update',
      resourceType: 'tenant',
      resourceId: id,
      details: dto as any,
    });

    return updated;
  }

  async suspend(id: string, actorUserId?: string): Promise<Tenant> {
    return this.update(id, { status: TenantStatus.SUSPENDED }, actorUserId);
  }

  async activate(id: string, actorUserId?: string): Promise<Tenant> {
    return this.update(id, { status: TenantStatus.ACTIVE }, actorUserId);
  }
}
