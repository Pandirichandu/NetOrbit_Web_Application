import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { TenantContext } from '../tenant-context';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

export interface AuditLogParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  tenantId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Create an audit log entry — fire and forget (non-blocking)
   */
  log(params: AuditLogParams): void {
    const store = TenantContext.getStore();

    const metadata = {
      ...((params.details || params.metadata || {}) as Record<string, unknown>),
      ...(params.userEmail ? { userEmail: params.userEmail } : {}),
    };

    const entry = this.repo.create({
      tenantId: params.tenantId ?? store?.tenantId ?? null,
      userId: params.userId ?? store?.userId ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      oldValues: params.oldValues ?? null,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      requestId: params.requestId ?? store?.requestId ?? null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    // Non-blocking — do not await
    this.repo.save(entry).catch(() => {
      // Audit log failure must never crash the request
    });
  }

  async findAll(
    tenantId: string | null,
    pagination: PaginationDto,
    filters?: {
      resourceType?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<PaginatedResult<AuditLog>> {
    const qb = this.repo.createQueryBuilder('al');

    if (tenantId) {
      qb.where('al.tenant_id = :tenantId', { tenantId });
    }

    if (filters?.resourceType) {
      qb.andWhere('al.resource_type = :resourceType', { resourceType: filters.resourceType });
    }
    if (filters?.userId) {
      qb.andWhere('al.user_id = :userId', { userId: filters.userId });
    }
    if (filters?.action) {
      qb.andWhere('al.action = :action', { action: filters.action });
    }
    if (filters?.startDate) {
      qb.andWhere('al.created_at >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('al.created_at <= :endDate', { endDate: filters.endDate });
    }

    const total = await qb.getCount();
    const data = await qb
      .orderBy('al.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit ?? 20)
      .getMany();

    return {
      data,
      meta: {
        total,
        page: pagination.page ?? 1,
        limit: pagination.limit ?? 20,
        totalPages: Math.ceil(total / (pagination.limit ?? 20)),
      },
    };
  }
}
