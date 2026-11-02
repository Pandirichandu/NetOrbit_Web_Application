import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PasswordHistory } from '../auth/entities/password-history.entity';
import {
  CreateUserDto,
  InviteUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/users.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmailService } from '../auth/email.service';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepo: Repository<PasswordHistory>,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(pagination: PaginationDto, tenantId?: string | null, isSuperAdmin = false) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    if (!isSuperAdmin) {
      if (!tenantId) {
        qb.where('user.tenantId IS NULL');
      } else {
        qb.where('user.tenantId = :tenantId', { tenantId });
      }
    }

    if (pagination.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${pagination.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId?: string | null, isSuperAdmin = false): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!isSuperAdmin && tenantId && user.tenantId !== tenantId) {
      throw new ForbiddenException('Access to user across tenants is denied');
    }

    return user;
  }

  async create(dto: CreateUserDto, tenantId?: string | null, actorUserId?: string): Promise<User> {
    const targetTenantId = tenantId !== undefined ? tenantId : dto.tenantId || null;
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.userRepo.findOne({
      where: { email: normalizedEmail, tenantId: targetTenantId ? targetTenantId : IsNull() },
    });
    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this tenant`);
    }

    let roles: Role[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    const pass = dto.password || 'NetOrbit@Welcome2026';
    const passwordHash = await bcrypt.hash(pass, 10);

    const user = this.userRepo.create({
      email: normalizedEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || null,
      passwordHash,
      tenantId: targetTenantId,
      status: UserStatus.ACTIVE,
      isSuperAdmin: false,
      roles,
      forcePasswordChange: !dto.password,
      invitedBy: actorUserId || null,
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      tenantId: targetTenantId,
      userId: actorUserId,
      action: 'user.create',
      resourceType: 'user',
      resourceId: saved.id,
      details: { email: saved.email, roles: roles.map((r) => r.slug) },
    });

    return saved;
  }

  async invite(dto: InviteUserDto, tenantId?: string | null, actorUserId?: string): Promise<User> {
    const tempPassword = `NO@${uuidv4().substring(0, 8)}!`;
    const user = await this.create(
      {
        ...dto,
        password: tempPassword,
        tenantId: tenantId || undefined,
      },
      tenantId,
      actorUserId,
    );

    let tenantName = 'NetOrbit ISP';
    if (tenantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      if (tenant) tenantName = tenant.name;
    }

    await this.emailService.sendUserInvitation(user.email, tempPassword, tenantName);

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    tenantId?: string | null,
    actorUserId?: string,
    isSuperAdmin = false,
  ): Promise<User> {
    const user = await this.findOne(id, tenantId, isSuperAdmin);

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.status) user.status = dto.status;

    if (dto.roleIds) {
      user.roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      tenantId: user.tenantId,
      userId: actorUserId,
      action: 'user.update',
      resourceType: 'user',
      resourceId: saved.id,
      details: dto as any,
    });

    return saved;
  }

  async deactivate(id: string, tenantId?: string | null, actorUserId?: string): Promise<User> {
    return this.update(id, { status: UserStatus.INACTIVE }, tenantId, actorUserId);
  }

  async reactivate(id: string, tenantId?: string | null, actorUserId?: string): Promise<User> {
    return this.update(id, { status: UserStatus.ACTIVE }, tenantId, actorUserId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidCurrent = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw new BadRequestException('Incorrect current password');
    }

    // Check last 5 password histories
    const recentHistories = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    for (const h of recentHistories) {
      const match = await bcrypt.compare(dto.newPassword, h.passwordHash);
      if (match) {
        throw new BadRequestException('You cannot reuse any of your last 5 passwords');
      }
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.passwordHistoryRepo.save(
      this.passwordHistoryRepo.create({
        userId,
        passwordHash: newHash,
      }),
    );

    user.passwordHash = newHash;
    user.forcePasswordChange = false;
    await this.userRepo.save(user);

    return { success: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;

    return this.userRepo.save(user);
  }
}
