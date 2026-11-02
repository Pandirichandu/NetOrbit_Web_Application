import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Voucher, VoucherStatus } from './entities/voucher.entity';
import { Package } from '../packages/entities/package.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { GenerateVouchersDto, RedeemVoucherDto, VoucherQueryDto } from './dto/vouchers.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: VoucherQueryDto,
    tenantId: string | null,
    isSuperAdmin: boolean,
  ): Promise<PaginatedResult<Voucher>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.package', 'package')
      .leftJoinAndSelect('v.redeemedBySubscriber', 'subscriber');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for voucher operations');
      }
      qb.andWhere('v.tenantId = :tenantId', { tenantId });
    }

    if (query.status) {
      qb.andWhere('v.status = :status', { status: query.status });
    }

    if (query.batchNumber) {
      qb.andWhere('v.batchNumber = :batch', { batch: query.batchNumber });
    }

    if (query.search) {
      qb.andWhere('(v.code ILIKE :search OR v.batchNumber ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('v.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, query);
  }

  async findOne(id: string, tenantId: string | null, isSuperAdmin: boolean): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({
      where: { id },
      relations: ['package', 'redeemedBySubscriber'],
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID '${id}' not found`);
    }

    if (!isSuperAdmin && voucher.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant voucher access denied');
    }

    return voucher;
  }

  async generate(
    dto: GenerateVouchersDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<Voucher[]> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to generate vouchers');
    }

    if (dto.packageId) {
      const pkg = await this.packageRepo.findOne({
        where: { id: dto.packageId, tenantId },
      });
      if (!pkg) {
        throw new NotFoundException('Package not found within this tenant');
      }
    }

    const count = Math.min(500, Math.max(1, dto.count));
    const batchNumber = dto.batchNumber || `BATCH-${Date.now()}`;
    const prefix = (dto.prefix || 'NET').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const durationMinutes = dto.durationMinutes ?? 1440;
    const maxUses = dto.maxUses ?? 1;
    const price = Number(dto.price ?? 0);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const vouchersToCreate: Voucher[] = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateUniqueCode(prefix);
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const voucher = this.voucherRepo.create({
        tenantId,
        code,
        pin,
        batchNumber,
        packageId: dto.packageId || null,
        durationMinutes,
        dataQuotaMb: dto.dataQuotaMb || null,
        status: VoucherStatus.ACTIVE,
        price,
        maxUses,
        usedCount: 0,
        expiresAt,
      });

      vouchersToCreate.push(voucher);
    }

    const savedVouchers = await this.voucherRepo.save(vouchersToCreate);

    this.auditService.log({
      action: 'vouchers:generate',
      resourceType: 'vouchers',
      tenantId,
      userId,
      userEmail,
      details: {
        count: savedVouchers.length,
        batchNumber,
        packageId: dto.packageId,
      },
    });

    return savedVouchers;
  }

  async redeem(
    dto: RedeemVoucherDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{ success: boolean; voucher: Voucher; bandwidthProfile?: any }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required for redemption');
    }

    const code = dto.code.trim().toUpperCase();
    const voucher = await this.voucherRepo.findOne({
      where: { tenantId, code },
      relations: ['package'],
    });

    if (!voucher) {
      throw new NotFoundException('Invalid voucher code');
    }

    if (voucher.pin && dto.pin && voucher.pin !== dto.pin.trim()) {
      throw new BadRequestException('Invalid voucher PIN');
    }

    if (voucher.status === VoucherStatus.REVOKED) {
      throw new BadRequestException('This voucher has been revoked');
    }

    if (voucher.status === VoucherStatus.EXPIRED) {
      throw new BadRequestException('This voucher has expired');
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      voucher.status = VoucherStatus.EXPIRED;
      await this.voucherRepo.save(voucher);
      throw new BadRequestException('This voucher has expired');
    }

    if (voucher.usedCount >= voucher.maxUses) {
      voucher.status = VoucherStatus.REDEEMED;
      await this.voucherRepo.save(voucher);
      throw new BadRequestException('This voucher has reached maximum usage limit');
    }

    // Process redemption
    voucher.usedCount += 1;
    if (voucher.usedCount >= voucher.maxUses) {
      voucher.status = VoucherStatus.REDEEMED;
    }
    voucher.redeemedAt = new Date();

    if (dto.subscriberId) {
      const sub = await this.subscriberRepo.findOne({
        where: { id: dto.subscriberId, tenantId },
      });
      if (sub) {
        voucher.redeemedBySubscriberId = sub.id;
      }
    }

    if (dto.macAddress) {
      voucher.redeemedByMac = dto.macAddress.trim();
    }

    const saved = await this.voucherRepo.save(voucher);

    this.auditService.log({
      action: 'voucher:redeem',
      resourceType: 'vouchers',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        code: saved.code,
        usedCount: saved.usedCount,
        maxUses: saved.maxUses,
        macAddress: dto.macAddress,
      },
    });

    return {
      success: true,
      voucher: saved,
      bandwidthProfile: saved.package ? {
        packageName: saved.package.name,
        downloadSpeedMbps: saved.package.downloadSpeedMbps,
        uploadSpeedMbps: saved.package.uploadSpeedMbps,
        durationMinutes: saved.durationMinutes,
        dataQuotaMb: saved.dataQuotaMb,
      } : {
        durationMinutes: saved.durationMinutes,
        dataQuotaMb: saved.dataQuotaMb,
      },
    };
  }

  async revoke(
    id: string,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOne({
      where: { id, tenantId },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    voucher.status = VoucherStatus.REVOKED;
    const updated = await this.voucherRepo.save(voucher);

    this.auditService.log({
      action: 'voucher:revoke',
      resourceType: 'vouchers',
      resourceId: updated.id,
      tenantId,
      userId,
      userEmail,
      details: { code: updated.code },
    });

    return updated;
  }

  private generateUniqueCode(prefix: string): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randPart1 = Array.from(crypto.randomBytes(4))
      .map((b) => chars[b % chars.length])
      .join('');
    const randPart2 = Array.from(crypto.randomBytes(4))
      .map((b) => chars[b % chars.length])
      .join('');
    return `${prefix}-${randPart1}-${randPart2}`;
  }
}
