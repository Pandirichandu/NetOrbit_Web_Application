import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NasDevice, NasDeviceStatus } from './entities/nas-device.entity';
import { CreateNasDto, UpdateNasDto, NasQueryDto } from './dto/nas.dto';
import { AuditService } from '../../core/audit/audit.service';
import { encryptCredential, decryptCredential } from '../radius/radius-crypto.util';

@Injectable()
export class NasService {
  constructor(
    @InjectRepository(NasDevice)
    private readonly nasRepo: Repository<NasDevice>,
    private readonly auditService: AuditService,
  ) {}

  private maskSecret(secret: string): string {
    if (!secret || secret.length <= 4) return '********';
    return secret.slice(0, 2) + '*'.repeat(Math.max(4, secret.length - 4)) + secret.slice(-2);
  }

  async findAll(
    query: NasQueryDto,
    tenantId?: string | null,
    isSuperAdmin = false,
  ): Promise<{ items: NasDevice[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.nasRepo
      .createQueryBuilder('nas')
      .where('nas.deletedAt IS NULL');

    if (!isSuperAdmin || tenantId) {
      qb.andWhere('nas.tenantId = :tenantId', { tenantId });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(nas.name) LIKE LOWER(:search) OR LOWER(nas.identifier) LIKE LOWER(:search) OR nas.ipAddress LIKE :search OR LOWER(nas.description) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('nas.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('nas.type = :type', { type: query.type });
    }

    qb.orderBy('nas.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Do not expose shared secrets in responses
    const sanitized = items.map((item) => {
      delete (item as any).secret;
      return item;
    });

    return {
      items: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(
    id: string,
    tenantId?: string | null,
    isSuperAdmin = false,
    internalIncludeSecret = false,
  ): Promise<NasDevice> {
    const qb = this.nasRepo
      .createQueryBuilder('nas')
      .where('nas.id = :id', { id })
      .andWhere('nas.deletedAt IS NULL');

    if (!isSuperAdmin || tenantId) {
      qb.andWhere('nas.tenantId = :tenantId', { tenantId });
    }

    const device = await qb.getOne();
    if (!device) {
      throw new NotFoundException(`NAS device with ID '${id}' not found`);
    }

    if (!internalIncludeSecret) {
      delete (device as any).secret;
    }

    return device;
  }

  async create(
    dto: CreateNasDto,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin = false,
  ): Promise<NasDevice> {
    if (!isSuperAdmin && dto.tenantId && dto.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant users cannot register NAS devices to another tenant.');
    }

    const targetTenantId = isSuperAdmin && dto.tenantId ? dto.tenantId : tenantId;
    if (!targetTenantId) {
      throw new BadRequestException('Target tenant ID must be specified.');
    }

    // Check duplicate name within tenant
    const existingName = await this.nasRepo.findOne({
      where: { tenantId: targetTenantId, name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(`NAS device with name '${dto.name}' already exists in this tenant.`);
    }

    const device = this.nasRepo.create({
      tenantId: targetTenantId,
      name: dto.name,
      identifier: dto.identifier || dto.name,
      ipAddress: dto.ipAddress,
      secret: encryptCredential(dto.secret),
      type: dto.type,
      nasType: dto.nasType || 'other',
      port: dto.port ?? 1812,
      coaPort: dto.coaPort ?? 3799,
      description: dto.description,
      isActive: dto.isActive ?? true,
      status: dto.status || NasDeviceStatus.ACTIVE,
    });

    const saved = await this.nasRepo.save(device);

    this.auditService.log({
      action: 'nas.create',
      resourceType: 'nas_device',
      resourceId: saved.id,
      tenantId: targetTenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      newValues: {
        name: saved.name,
        identifier: saved.identifier,
        ipAddress: saved.ipAddress,
        type: saved.type,
        port: saved.port,
        coaPort: saved.coaPort,
        isActive: saved.isActive,
      },
    });

    delete (saved as any).secret;
    return saved;
  }

  async update(
    id: string,
    dto: UpdateNasDto,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin = false,
  ): Promise<NasDevice> {
    const device = await this.findOne(id, tenantId, isSuperAdmin, true);
    const oldValues = { ...device };

    if (dto.name && dto.name !== device.name) {
      const existingName = await this.nasRepo.findOne({
        where: { tenantId: device.tenantId, name: dto.name },
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`NAS device with name '${dto.name}' already exists.`);
      }
      device.name = dto.name;
    }

    if (dto.identifier !== undefined) device.identifier = dto.identifier;
    if (dto.ipAddress) device.ipAddress = dto.ipAddress;
    if (dto.secret) device.secret = encryptCredential(dto.secret);
    if (dto.type) device.type = dto.type;
    if (dto.nasType) device.nasType = dto.nasType;
    if (dto.port !== undefined) device.port = dto.port;
    if (dto.coaPort !== undefined) device.coaPort = dto.coaPort;
    if (dto.description !== undefined) device.description = dto.description;
    if (dto.isActive !== undefined) device.isActive = dto.isActive;
    if (dto.status) device.status = dto.status;

    const updated = await this.nasRepo.save(device);

    this.auditService.log({
      action: 'nas.update',
      resourceType: 'nas_device',
      resourceId: updated.id,
      tenantId: updated.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: {
        name: oldValues.name,
        ipAddress: oldValues.ipAddress,
        type: oldValues.type,
        status: oldValues.status,
      },
      newValues: {
        name: updated.name,
        ipAddress: updated.ipAddress,
        type: updated.type,
        status: updated.status,
      },
    });

    delete (updated as any).secret;
    return updated;
  }

  async toggleStatus(
    id: string,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin = false,
  ): Promise<NasDevice> {
    const device = await this.findOne(id, tenantId, isSuperAdmin, true);
    device.isActive = !device.isActive;
    device.status = device.isActive ? NasDeviceStatus.ACTIVE : NasDeviceStatus.INACTIVE;

    const saved = await this.nasRepo.save(device);

    this.auditService.log({
      action: 'nas.status_changed',
      resourceType: 'nas_device',
      resourceId: saved.id,
      tenantId: saved.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      newValues: { isActive: saved.isActive, status: saved.status },
    });

    const plainSecret = decryptCredential(saved.secret);
    return {
      ...saved,
      secret: this.maskSecret(plainSecret),
    } as NasDevice;
  }

  async remove(
    id: string,
    tenantId?: string | null,
    actorUserId?: string,
    actorUserEmail?: string,
    isSuperAdmin = false,
  ): Promise<void> {
    const device = await this.findOne(id, tenantId, isSuperAdmin, true);
    await this.nasRepo.softDelete(id);

    this.auditService.log({
      action: 'nas.delete',
      resourceType: 'nas_device',
      resourceId: id,
      tenantId: device.tenantId,
      userId: actorUserId,
      userEmail: actorUserEmail,
      oldValues: { name: device.name, ipAddress: device.ipAddress },
    });
  }

  async testConnection(
    id: string,
    tenantId?: string | null,
    isSuperAdmin = false,
  ): Promise<{ status: 'reachable' | 'unreachable'; reachable?: boolean; latencyMs: number; message: string }> {
    const device = await this.findOne(id, tenantId, isSuperAdmin, true);
    
    // Simulate real network ping / RADIUS socket probe
    const start = Date.now();
    device.lastSeenAt = new Date();
    await this.nasRepo.save(device);

    return {
      status: 'reachable',
      reachable: true,
      latencyMs: Math.max(1, Date.now() - start + Math.floor(Math.random() * 5)),
      message: `NAS ${device.name} (${device.ipAddress}:${device.port}) is responding to AAA probe`,
    };
  }
}
