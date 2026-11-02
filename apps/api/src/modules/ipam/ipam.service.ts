import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpPool, IpPoolType, IpVersion } from './entities/ip-pool.entity';
import { IpAddressAllocation, IpAllocationStatus } from './entities/ip-allocation.entity';
import { CreateIpPoolDto, AllocateIpDto, IpPoolQueryDto } from './dto/ipam.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';

export function ipToLong(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.');
}

@Injectable()
export class IpamService {
  private readonly logger = new Logger(IpamService.name);

  constructor(
    @InjectRepository(IpPool)
    private readonly poolRepo: Repository<IpPool>,
    @InjectRepository(IpAddressAllocation)
    private readonly allocRepo: Repository<IpAddressAllocation>,
    private readonly auditService: AuditService,
  ) {}

  async findAllPools(
    query: IpPoolQueryDto,
    tenantId: string | null,
    isSuperAdmin: boolean,
  ): Promise<PaginatedResult<IpPool>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.poolRepo.createQueryBuilder('pool');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for IPAM operations');
      }
      qb.andWhere('pool.tenantId = :tenantId', { tenantId });
    }

    if (query.type) {
      qb.andWhere('pool.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere('(pool.name ILIKE :search OR pool.subnet ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('pool.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, query);
  }

  async findPool(id: string, tenantId: string | null, isSuperAdmin: boolean): Promise<IpPool> {
    const pool = await this.poolRepo.findOne({ where: { id } });

    if (!pool) {
      throw new NotFoundException(`IP Pool with ID '${id}' not found`);
    }

    if (!isSuperAdmin && pool.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant IP Pool access denied');
    }

    return pool;
  }

  async createPool(
    dto: CreateIpPoolDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<IpPool> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to create an IP Pool');
    }

    const existing = await this.poolRepo.findOne({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`IP Pool named '${dto.name}' already exists in this tenant`);
    }

    const startLong = ipToLong(dto.startIp);
    const endLong = ipToLong(dto.endIp);

    if (startLong > endLong) {
      throw new BadRequestException('Start IP must be less than or equal to End IP');
    }

    const totalIps = endLong - startLong + 1;

    const pool = this.poolRepo.create({
      tenantId,
      name: dto.name,
      subnet: dto.subnet,
      startIp: dto.startIp,
      endIp: dto.endIp,
      gateway: dto.gateway || null,
      dnsServers: dto.dnsServers || null,
      type: dto.type || IpPoolType.DYNAMIC,
      ipVersion: dto.ipVersion || IpVersion.IPV4,
      totalIps,
      allocatedIps: 0,
      reservedIps: 0,
      isActive: true,
    });

    const saved = await this.poolRepo.save(pool);

    this.auditService.log({
      action: 'ipam:create_pool',
      resourceType: 'ip_pools',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        name: saved.name,
        subnet: saved.subnet,
        totalIps: saved.totalIps,
      },
    });

    return saved;
  }

  async findAllocations(
    poolId: string,
    tenantId: string | null,
    isSuperAdmin: boolean,
  ): Promise<IpAddressAllocation[]> {
    await this.findPool(poolId, tenantId, isSuperAdmin);

    const qb = this.allocRepo
      .createQueryBuilder('alloc')
      .where('alloc.poolId = :poolId', { poolId });

    if (!isSuperAdmin && tenantId) {
      qb.andWhere('alloc.tenantId = :tenantId', { tenantId });
    }

    return qb.orderBy('alloc.allocatedAt', 'DESC').getMany();
  }

  async allocateIp(
    poolId: string,
    dto: AllocateIpDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<IpAddressAllocation> {
    const pool = await this.findPool(poolId, tenantId, false);

    const startLong = ipToLong(pool.startIp);
    const endLong = ipToLong(pool.endIp);

    let targetIp: string;

    if (dto.ipAddress) {
      const targetLong = ipToLong(dto.ipAddress);
      if (targetLong < startLong || targetLong > endLong) {
        throw new BadRequestException(`Requested IP '${dto.ipAddress}' is outside pool range (${pool.startIp} - ${pool.endIp})`);
      }

      // Check if already active
      const existing = await this.allocRepo.findOne({
        where: {
          tenantId,
          poolId,
          ipAddress: dto.ipAddress,
        },
      });

      if (existing && existing.status !== IpAllocationStatus.RELEASED) {
        throw new ConflictException(`IP address '${dto.ipAddress}' is already allocated or reserved`);
      }

      targetIp = dto.ipAddress;
    } else {
      // Find next available IP
      const activeAllocations = await this.allocRepo
        .createQueryBuilder('alloc')
        .select('alloc.ipAddress')
        .where('alloc.tenantId = :tenantId', { tenantId })
        .andWhere('alloc.poolId = :poolId', { poolId })
        .andWhere('alloc.status IN (:...statuses)', {
          statuses: [IpAllocationStatus.ALLOCATED, IpAllocationStatus.RESERVED],
        })
        .getMany();

      const allocatedSet = new Set(activeAllocations.map((a) => a.ipAddress));

      let found = false;
      targetIp = '';
      for (let currLong = startLong; currLong <= endLong; currLong++) {
        const candidate = longToIp(currLong);
        if (!allocatedSet.has(candidate)) {
          targetIp = candidate;
          found = true;
          break;
        }
      }

      if (!found || !targetIp) {
        throw new BadRequestException('IP Pool is exhausted: no free IP addresses available');
      }
    }

    const status = dto.status || IpAllocationStatus.ALLOCATED;

    let allocation = await this.allocRepo.findOne({
      where: {
        tenantId,
        poolId,
        ipAddress: targetIp,
      },
    });

    if (allocation) {
      allocation.macAddress = dto.macAddress || null;
      allocation.allocatedToType = dto.allocatedToType || 'subscriber';
      allocation.allocatedToId = dto.allocatedToId || null;
      allocation.status = status;
      allocation.reservedReason = dto.reservedReason || null;
      allocation.allocatedAt = new Date();
      allocation.releasedAt = null;
    } else {
      allocation = this.allocRepo.create({
        tenantId,
        poolId,
        ipAddress: targetIp,
        macAddress: dto.macAddress || null,
        allocatedToType: dto.allocatedToType || 'subscriber',
        allocatedToId: dto.allocatedToId || null,
        status,
        reservedReason: dto.reservedReason || null,
        allocatedAt: new Date(),
        releasedAt: null,
      });
    }

    const saved = await this.allocRepo.save(allocation);

    // Update pool counters
    if (status === IpAllocationStatus.RESERVED) {
      pool.reservedIps = (pool.reservedIps || 0) + 1;
    } else {
      pool.allocatedIps = (pool.allocatedIps || 0) + 1;
    }
    await this.poolRepo.save(pool);

    this.auditService.log({
      action: 'ipam:allocate_ip',
      resourceType: 'ip_allocations',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        poolId,
        ipAddress: saved.ipAddress,
        macAddress: saved.macAddress,
        status: saved.status,
      },
    });

    return saved;
  }

  async releaseIp(
    allocationId: string,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<IpAddressAllocation> {
    const allocation = await this.allocRepo.findOne({
      where: { id: allocationId, tenantId },
      relations: ['pool'],
    });

    if (!allocation) {
      throw new NotFoundException(`IP allocation '${allocationId}' not found`);
    }

    if (allocation.status === IpAllocationStatus.RELEASED) {
      return allocation;
    }

    const prevStatus = allocation.status;
    allocation.status = IpAllocationStatus.RELEASED;
    allocation.releasedAt = new Date();
    const updated = await this.allocRepo.save(allocation);

    // Decrement pool counter
    if (allocation.pool) {
      if (prevStatus === IpAllocationStatus.RESERVED) {
        allocation.pool.reservedIps = Math.max(0, (allocation.pool.reservedIps || 0) - 1);
      } else {
        allocation.pool.allocatedIps = Math.max(0, (allocation.pool.allocatedIps || 0) - 1);
      }
      await this.poolRepo.save(allocation.pool);
    }

    this.auditService.log({
      action: 'ipam:release_ip',
      resourceType: 'ip_allocations',
      resourceId: updated.id,
      tenantId,
      userId,
      userEmail,
      details: {
        poolId: updated.poolId,
        ipAddress: updated.ipAddress,
      },
    });

    return updated;
  }
}
