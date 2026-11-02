import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { CreatePackageDto, UpdatePackageDto, PackageFilterDto } from './dto/packages.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    private readonly auditService: AuditService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(
    filter: PackageFilterDto,
    tenantId?: string | null,
    isSuperAdmin?: boolean,
  ): Promise<PaginatedResult<Package>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.packageRepo.createQueryBuilder('package');

    // Strict Tenant Isolation
    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required to query packages.');
      }
      qb.where('package.tenantId = :tenantId', { tenantId });
    }

    if (filter.type) {
      qb.andWhere('package.type = :type', { type: filter.type });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('package.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.search) {
      qb.andWhere(
        '(LOWER(package.name) LIKE LOWER(:search) OR LOWER(package.slug) LIKE LOWER(:search) OR LOWER(package.description) LIKE LOWER(:search))',
        { search: `%${filter.search}%` },
      );
    }

    const sortOrder = filter.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('package.createdAt', sortOrder);

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(items, total, filter);
  }

  async findOne(
    id: string,
    tenantId?: string | null,
    isSuperAdmin?: boolean,
  ): Promise<Package> {
    const qb = this.packageRepo.createQueryBuilder('package').where('package.id = :id', { id });

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID context is required.');
      }
      qb.andWhere('package.tenantId = :tenantId', { tenantId });
    }

    const pkg = await qb.getOne();
    if (!pkg) {
      throw new NotFoundException(`Package with ID '${id}' not found`);
    }
    return pkg;
  }

  async create(
    dto: CreatePackageDto,
    tenantId?: string | null,
    userId?: string,
    userEmail?: string,
  ): Promise<Package> {
    const targetTenantId = dto.tenantId || tenantId;
    if (!targetTenantId) {
      throw new BadRequestException('Target tenant ID must be specified for package creation.');
    }

    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

    // Ensure slug uniqueness within tenant
    const existing = await this.packageRepo.findOne({
      where: { tenantId: targetTenantId, slug },
    });
    if (existing) {
      throw new ConflictException(`Package with slug '${slug}' already exists in this tenant.`);
    }

    const pkg = this.packageRepo.create({
      ...dto,
      tenantId: targetTenantId,
      slug,
      features: dto.features || [],
    });

    const saved = await this.packageRepo.save(pkg);

    this.auditService.log({
      action: 'packages.create',
      resourceType: 'package',
      resourceId: saved.id,
      tenantId: targetTenantId,
      userId,
      userEmail,
      newValues: {
        name: saved.name,
        slug: saved.slug,
        price: saved.price,
        downloadSpeedMbps: saved.downloadSpeedMbps,
        uploadSpeedMbps: saved.uploadSpeedMbps,
      },
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdatePackageDto,
    tenantId?: string | null,
    userId?: string,
    userEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Package> {
    const pkg = await this.findOne(id, tenantId, isSuperAdmin);
    const oldValues = { ...pkg };

    if (dto.slug && dto.slug !== pkg.slug) {
      const slug = this.slugify(dto.slug);
      const existing = await this.packageRepo.findOne({
        where: { tenantId: pkg.tenantId, slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Package with slug '${slug}' already exists in this tenant.`);
      }
      pkg.slug = slug;
    }

    Object.assign(pkg, dto);
    const updated = await this.packageRepo.save(pkg);

    this.auditService.log({
      action: 'packages.update',
      resourceType: 'package',
      resourceId: updated.id,
      tenantId: pkg.tenantId,
      userId,
      userEmail,
      oldValues: {
        name: oldValues.name,
        price: oldValues.price,
        downloadSpeedMbps: oldValues.downloadSpeedMbps,
        uploadSpeedMbps: oldValues.uploadSpeedMbps,
      },
      newValues: {
        name: updated.name,
        price: updated.price,
        downloadSpeedMbps: updated.downloadSpeedMbps,
        uploadSpeedMbps: updated.uploadSpeedMbps,
      },
    });

    return updated;
  }

  async activate(
    id: string,
    tenantId?: string | null,
    userId?: string,
    userEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Package> {
    const pkg = await this.findOne(id, tenantId, isSuperAdmin);
    pkg.isActive = true;
    const saved = await this.packageRepo.save(pkg);

    this.auditService.log({
      action: 'packages.activate',
      resourceType: 'package',
      resourceId: saved.id,
      tenantId: saved.tenantId,
      userId,
      userEmail,
      newValues: { isActive: true },
    });

    return saved;
  }

  async deactivate(
    id: string,
    tenantId?: string | null,
    userId?: string,
    userEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Package> {
    const pkg = await this.findOne(id, tenantId, isSuperAdmin);
    pkg.isActive = false;
    const saved = await this.packageRepo.save(pkg);

    this.auditService.log({
      action: 'packages.deactivate',
      resourceType: 'package',
      resourceId: saved.id,
      tenantId: saved.tenantId,
      userId,
      userEmail,
      newValues: { isActive: false },
    });

    return saved;
  }

  async remove(
    id: string,
    tenantId?: string | null,
    userId?: string,
    userEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<void> {
    const pkg = await this.findOne(id, tenantId, isSuperAdmin);
    await this.packageRepo.softDelete(id);

    this.auditService.log({
      action: 'packages.delete',
      resourceType: 'package',
      resourceId: id,
      tenantId: pkg.tenantId,
      userId,
      userEmail,
      oldValues: { name: pkg.name, slug: pkg.slug },
    });
  }
}
