import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Subscriber, SubscriberStatus } from './entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import {
  CreateSubscriberDto,
  UpdateSubscriberDto,
  UpdateSubscriberStatusDto,
  SubscriberFilterDto,
} from './dto/subscribers.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly auditService: AuditService,
  ) {}

  private generateAccountNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SUB-${timestamp}-${random}`;
  }

  async findAll(
    filter: SubscriberFilterDto,
    tenantId?: string | null,
    isSuperAdmin?: boolean,
  ): Promise<PaginatedResult<Subscriber>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.subscriberRepo
      .createQueryBuilder('subscriber')
      .leftJoinAndSelect('subscriber.package', 'package')
      .leftJoinAndSelect('subscriber.user', 'user');

    // Strict Tenant Isolation
    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required to query subscribers.');
      }
      qb.where('subscriber.tenantId = :tenantId', { tenantId });
    }

    if (filter.status) {
      qb.andWhere('subscriber.status = :status', { status: filter.status });
    }

    if (filter.packageId) {
      qb.andWhere('subscriber.packageId = :packageId', { packageId: filter.packageId });
    }

    if (filter.search) {
      qb.andWhere(
        `(LOWER(subscriber.firstName) LIKE LOWER(:search) OR 
          LOWER(subscriber.lastName) LIKE LOWER(:search) OR 
          LOWER(subscriber.email) LIKE LOWER(:search) OR 
          LOWER(subscriber.phone) LIKE LOWER(:search) OR 
          LOWER(subscriber.accountNumber) LIKE LOWER(:search) OR 
          LOWER(subscriber.username) LIKE LOWER(:search))`,
        { search: `%${filter.search}%` },
      );
    }

    const sortOrder = filter.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('subscriber.createdAt', sortOrder);

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(items, total, filter);
  }

  async findOne(
    id: string,
    tenantId?: string | null,
    isSuperAdmin?: boolean,
  ): Promise<Subscriber> {
    const qb = this.subscriberRepo
      .createQueryBuilder('subscriber')
      .leftJoinAndSelect('subscriber.package', 'package')
      .leftJoinAndSelect('subscriber.user', 'user')
      .where('subscriber.id = :id', { id });

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID context is required.');
      }
      qb.andWhere('subscriber.tenantId = :tenantId', { tenantId });
    }

    const sub = await qb.getOne();
    if (!sub) {
      throw new NotFoundException(`Subscriber with ID '${id}' not found`);
    }
    return sub;
  }

  async create(
    dto: CreateSubscriberDto,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
  ): Promise<Subscriber> {
    const targetTenantId = dto.tenantId || tenantId;
    if (!targetTenantId) {
      throw new BadRequestException('Target tenant ID must be specified.');
    }

    // 1. Verify package belongs to target tenant if packageId is supplied
    let pkg: Package | null = null;
    if (dto.packageId) {
      pkg = await this.packageRepo.findOne({
        where: { id: dto.packageId, tenantId: targetTenantId },
      });
      if (!pkg) {
        throw new BadRequestException('The selected package does not exist or does not belong to this tenant.');
      }
    }

    // 2. Check username uniqueness within tenant
    const existingUsername = await this.subscriberRepo.findOne({
      where: { tenantId: targetTenantId, username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException(`Subscriber with username '${dto.username}' already exists in this tenant.`);
    }

    // 3. Optional: Create Customer Portal user account
    let portalUserId: string | null = null;
    if (dto.createPortalUser) {
      const existingUser = await this.userRepo.findOne({
        where: { email: dto.email, tenantId: targetTenantId },
      });
      if (existingUser) {
        portalUserId = existingUser.id;
      } else {
        const customerRole = await this.roleRepo.findOne({
          where: { slug: 'customer', isSystem: true },
        });
        const rawPassword = dto.password || 'NetOrbit@Customer2026';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const newUser = this.userRepo.create({
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          tenantId: targetTenantId,
          status: UserStatus.ACTIVE,
          roles: customerRole ? [customerRole] : [],
        });
        const savedUser = await this.userRepo.save(newUser);
        portalUserId = savedUser.id;
      }
    }

    // 4. Hash broadband password if provided
    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // 5. Account Number and Dates
    const accountNumber = this.generateAccountNumber();
    const startDate = new Date();
    let expiryDate: Date | null = null;
    if (pkg && pkg.validityDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + pkg.validityDays);
    }

    const subscriber = this.subscriberRepo.create({
      ...dto,
      tenantId: targetTenantId,
      accountNumber,
      userId: portalUserId,
      passwordHash,
      status: pkg ? SubscriberStatus.ACTIVE : SubscriberStatus.PENDING,
      startDate: pkg ? startDate : null,
      expiryDate,
      country: dto.country || 'US',
    });

    const saved = await this.subscriberRepo.save(subscriber);

    this.auditService.log({
      action: 'subscribers.create',
      resourceType: 'subscriber',
      resourceId: saved.id,
      tenantId: targetTenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      newValues: {
        accountNumber: saved.accountNumber,
        fullName: `${saved.firstName} ${saved.lastName}`,
        email: saved.email,
        username: saved.username,
        status: saved.status,
        packageId: saved.packageId,
      },
    });

    return this.findOne(saved.id, targetTenantId, true);
  }

  async update(
    id: string,
    dto: UpdateSubscriberDto,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Subscriber> {
    const subscriber = await this.findOne(id, tenantId, isSuperAdmin);
    const oldValues = { ...subscriber };

    // Validate package ownership if packageId changed
    if (dto.packageId && dto.packageId !== subscriber.packageId) {
      const pkg = await this.packageRepo.findOne({
        where: { id: dto.packageId, tenantId: subscriber.tenantId },
      });
      if (!pkg) {
        throw new BadRequestException('The assigned package does not belong to this tenant.');
      }
      subscriber.packageId = dto.packageId;
      subscriber.package = pkg;
    }

    if (dto.username && dto.username !== subscriber.username) {
      const existing = await this.subscriberRepo.findOne({
        where: { tenantId: subscriber.tenantId, username: dto.username },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Username '${dto.username}' already in use.`);
      }
      subscriber.username = dto.username;
    }

    if (dto.password) {
      subscriber.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(subscriber, {
      firstName: dto.firstName ?? subscriber.firstName,
      lastName: dto.lastName ?? subscriber.lastName,
      email: dto.email ?? subscriber.email,
      phone: dto.phone ?? subscriber.phone,
      alternatePhone: dto.alternatePhone ?? subscriber.alternatePhone,
      companyName: dto.companyName ?? subscriber.companyName,
      nationalId: dto.nationalId ?? subscriber.nationalId,
      addressLine1: dto.addressLine1 ?? subscriber.addressLine1,
      addressLine2: dto.addressLine2 ?? subscriber.addressLine2,
      city: dto.city ?? subscriber.city,
      state: dto.state ?? subscriber.state,
      postalCode: dto.postalCode ?? subscriber.postalCode,
      country: dto.country ?? subscriber.country,
      gpsCoordinates: dto.gpsCoordinates ?? subscriber.gpsCoordinates,
      ipAssignmentType: dto.ipAssignmentType ?? subscriber.ipAssignmentType,
      staticIp: dto.staticIp ?? subscriber.staticIp,
      macAddress: dto.macAddress ?? subscriber.macAddress,
      autoRenew: dto.autoRenew ?? subscriber.autoRenew,
      notes: dto.notes ?? subscriber.notes,
    });

    const updated = await this.subscriberRepo.save(subscriber);

    this.auditService.log({
      action: 'subscribers.update',
      resourceType: 'subscriber',
      resourceId: updated.id,
      tenantId: updated.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: {
        email: oldValues.email,
        phone: oldValues.phone,
        packageId: oldValues.packageId,
        status: oldValues.status,
      },
      newValues: {
        email: updated.email,
        phone: updated.phone,
        packageId: updated.packageId,
        status: updated.status,
      },
    });

    return this.findOne(updated.id, updated.tenantId, isSuperAdmin);
  }

  async changeStatus(
    id: string,
    statusDto: UpdateSubscriberStatusDto,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Subscriber> {
    const subscriber = await this.findOne(id, tenantId, isSuperAdmin);
    const oldStatus = subscriber.status;
    subscriber.status = statusDto.status;

    if (statusDto.status === SubscriberStatus.ACTIVE && !subscriber.startDate) {
      subscriber.startDate = new Date();
      if (subscriber.package && subscriber.package.validityDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + subscriber.package.validityDays);
        subscriber.expiryDate = expiry;
      }
    }

    const updated = await this.subscriberRepo.save(subscriber);

    this.auditService.log({
      action: 'subscribers.status_changed',
      resourceType: 'subscriber',
      resourceId: updated.id,
      tenantId: updated.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: { status: oldStatus },
      newValues: { status: updated.status, reason: statusDto.reason },
    });

    return updated;
  }

  async changePackage(
    id: string,
    packageId: string,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<Subscriber> {
    const subscriber = await this.findOne(id, tenantId, isSuperAdmin);
    const pkg = await this.packageRepo.findOne({
      where: { id: packageId, tenantId: subscriber.tenantId },
    });
    if (!pkg) {
      throw new BadRequestException('Package does not belong to this tenant.');
    }

    const oldPackageId = subscriber.packageId;
    subscriber.packageId = packageId;
    subscriber.package = pkg;

    if (subscriber.status === SubscriberStatus.ACTIVE) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + pkg.validityDays);
      subscriber.expiryDate = expiry;
    }

    const updated = await this.subscriberRepo.save(subscriber);

    this.auditService.log({
      action: 'subscribers.package_changed',
      resourceType: 'subscriber',
      resourceId: updated.id,
      tenantId: updated.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: { packageId: oldPackageId },
      newValues: { packageId: updated.packageId, packageName: pkg.name },
    });

    return this.findOne(updated.id, updated.tenantId, isSuperAdmin);
  }

  async remove(
    id: string,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin?: boolean,
  ): Promise<void> {
    const subscriber = await this.findOne(id, tenantId, isSuperAdmin);
    await this.subscriberRepo.softDelete(id);

    this.auditService.log({
      action: 'subscribers.delete',
      resourceType: 'subscriber',
      resourceId: id,
      tenantId: subscriber.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: {
        accountNumber: subscriber.accountNumber,
        email: subscriber.email,
        username: subscriber.username,
      },
    });
  }
}
