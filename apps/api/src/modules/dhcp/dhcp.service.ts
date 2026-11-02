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
import { DhcpScope, DhcpScopeStatus } from './entities/dhcp-scope.entity';
import { DhcpLease, DhcpLeaseStatus } from './entities/dhcp-lease.entity';
import { IpPool } from '../ipam/entities/ip-pool.entity';
import { CreateDhcpScopeDto, CreateStaticReservationDto, DhcpQueryDto } from './dto/dhcp.dto';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AuditService } from '../../core/audit/audit.service';
import { IpamService } from '../ipam/ipam.service';
import { IpAllocationStatus } from '../ipam/entities/ip-allocation.entity';

@Injectable()
export class DhcpService {
  private readonly logger = new Logger(DhcpService.name);

  constructor(
    @InjectRepository(DhcpScope)
    private readonly scopeRepo: Repository<DhcpScope>,
    @InjectRepository(DhcpLease)
    private readonly leaseRepo: Repository<DhcpLease>,
    @InjectRepository(IpPool)
    private readonly poolRepo: Repository<IpPool>,
    private readonly ipamService: IpamService,
    private readonly auditService: AuditService,
  ) {}

  async findAllScopes(tenantId: string | null, isSuperAdmin: boolean): Promise<DhcpScope[]> {
    const qb = this.scopeRepo.createQueryBuilder('scope').leftJoinAndSelect('scope.pool', 'pool');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for DHCP operations');
      }
      qb.andWhere('scope.tenantId = :tenantId', { tenantId });
    }

    return qb.orderBy('scope.createdAt', 'DESC').getMany();
  }

  async findScope(id: string, tenantId: string | null, isSuperAdmin: boolean): Promise<DhcpScope> {
    const scope = await this.scopeRepo.findOne({
      where: { id },
      relations: ['pool'],
    });

    if (!scope) {
      throw new NotFoundException(`DHCP Scope with ID '${id}' not found`);
    }

    if (!isSuperAdmin && scope.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant DHCP scope access denied');
    }

    return scope;
  }

  async createScope(
    dto: CreateDhcpScopeDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DhcpScope> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to create a DHCP scope');
    }

    const existing = await this.scopeRepo.findOne({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`DHCP Scope named '${dto.name}' already exists in this tenant`);
    }

    let pool: IpPool | null = null;
    if (dto.poolId) {
      pool = await this.poolRepo.findOne({
        where: { id: dto.poolId, tenantId },
      });
      if (!pool) {
        throw new NotFoundException('Associated IPAM pool not found in this tenant');
      }
    }

    const scope = this.scopeRepo.create({
      tenantId,
      name: dto.name,
      poolId: dto.poolId || null,
      interfaceName: dto.interfaceName || 'ether2-lan',
      leaseTimeSeconds: dto.leaseTimeSeconds ?? 86400,
      domainName: dto.domainName || 'lan.netorbit.local',
      dnsServers: dto.dnsServers || '8.8.8.8, 1.1.1.1',
      gateway: dto.gateway || (pool ? pool.gateway : null),
      subnetMask: dto.subnetMask || '255.255.255.0',
      status: DhcpScopeStatus.ACTIVE,
    });

    const saved = await this.scopeRepo.save(scope);

    this.auditService.log({
      action: 'dhcp:create_scope',
      resourceType: 'dhcp_scopes',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        name: saved.name,
        poolId: saved.poolId,
        interface: saved.interfaceName,
      },
    });

    return saved;
  }

  async findAllLeases(
    query: DhcpQueryDto,
    tenantId: string | null,
    isSuperAdmin: boolean,
  ): Promise<PaginatedResult<DhcpLease>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.leaseRepo
      .createQueryBuilder('lease')
      .leftJoinAndSelect('lease.scope', 'scope');

    if (!isSuperAdmin || tenantId) {
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for DHCP operations');
      }
      qb.andWhere('lease.tenantId = :tenantId', { tenantId });
    }

    if (query.scopeId) {
      qb.andWhere('lease.scopeId = :scopeId', { scopeId: query.scopeId });
    }

    if (query.status) {
      qb.andWhere('lease.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere('(lease.ipAddress ILIKE :search OR lease.macAddress ILIKE :search OR lease.hostname ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('lease.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, query);
  }

  async createStaticReservation(
    dto: CreateStaticReservationDto,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DhcpLease> {
    const scope = await this.findScope(dto.scopeId, tenantId, false);
    const mac = dto.macAddress.trim().toLowerCase();
    const ip = dto.ipAddress.trim();

    // Check if IP is already taken in this scope
    const existingIp = await this.leaseRepo.findOne({
      where: { tenantId, scopeId: scope.id, ipAddress: ip },
    });
    if (existingIp && existingIp.status === DhcpLeaseStatus.ACTIVE) {
      throw new ConflictException(`IP address '${ip}' is already assigned to MAC '${existingIp.macAddress}'`);
    }

    // Check if MAC is already registered in this scope
    const existingMac = await this.leaseRepo.findOne({
      where: { tenantId, scopeId: scope.id, macAddress: mac },
    });
    if (existingMac && existingMac.status === DhcpLeaseStatus.ACTIVE) {
      throw new ConflictException(`MAC address '${mac}' is already registered with IP '${existingMac.ipAddress}'`);
    }

    // If scope has an IPAM pool linked, allocate/reserve the IP in IPAM as well
    if (scope.poolId) {
      try {
        await this.ipamService.allocateIp(
          scope.poolId,
          {
            ipAddress: ip,
            macAddress: mac,
            allocatedToType: 'dhcp_reservation',
            status: IpAllocationStatus.RESERVED,
            reservedReason: `Static DHCP reservation for ${dto.hostname || mac}`,
          },
          tenantId,
          userId,
          userEmail,
        );
      } catch (err: any) {
        // If IPAM error, propagate
        this.logger.warn(`IPAM pool reservation: ${err.message}`);
      }
    }

    const tenYearsMs = 10 * 365 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + tenYearsMs);

    const lease = existingIp || this.leaseRepo.create({
      tenantId,
      scopeId: scope.id,
      ipAddress: ip,
    });

    lease.macAddress = mac;
    lease.hostname = dto.hostname || null;
    lease.isStatic = true;
    lease.status = DhcpLeaseStatus.ACTIVE;
    lease.startsAt = new Date();
    lease.expiresAt = expiresAt;

    const saved = await this.leaseRepo.save(lease);

    this.auditService.log({
      action: 'dhcp:static_reservation',
      resourceType: 'dhcp_leases',
      resourceId: saved.id,
      tenantId,
      userId,
      userEmail,
      details: {
        scopeId: scope.id,
        ipAddress: saved.ipAddress,
        macAddress: saved.macAddress,
        hostname: saved.hostname,
      },
    });

    return saved;
  }

  async releaseLease(
    leaseId: string,
    tenantId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DhcpLease> {
    const lease = await this.leaseRepo.findOne({
      where: { id: leaseId, tenantId },
    });

    if (!lease) {
      throw new NotFoundException(`DHCP lease '${leaseId}' not found`);
    }

    lease.status = DhcpLeaseStatus.RELEASED;
    const updated = await this.leaseRepo.save(lease);

    this.auditService.log({
      action: 'dhcp:release_lease',
      resourceType: 'dhcp_leases',
      resourceId: updated.id,
      tenantId,
      userId,
      userEmail,
      details: {
        ipAddress: updated.ipAddress,
        macAddress: updated.macAddress,
      },
    });

    return updated;
  }
}
