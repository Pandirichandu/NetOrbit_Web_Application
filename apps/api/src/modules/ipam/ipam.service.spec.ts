import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IpamService } from './ipam.service';
import { IpPool, IpPoolType } from './entities/ip-pool.entity';
import { IpAddressAllocation, IpAllocationStatus } from './entities/ip-allocation.entity';
import { AuditService } from '../../core/audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('IpamService', () => {
  let service: IpamService;

  const mockPoolRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((pool) => Promise.resolve({ id: 'pool-1', ...pool })),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'pool-1',
            name: 'Office LAN',
            subnet: '192.168.10.0/24',
            startIp: '192.168.10.10',
            endIp: '192.168.10.20',
            totalIps: 11,
            allocatedIps: 1,
            tenantId: 'tenant-1',
          },
        ],
        1,
      ]),
    }),
  };

  const mockAllocRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((alloc) => Promise.resolve({ id: 'alloc-1', ...alloc })),
    createQueryBuilder: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpamService,
        { provide: getRepositoryToken(IpPool), useValue: mockPoolRepo },
        { provide: getRepositoryToken(IpAddressAllocation), useValue: mockAllocRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<IpamService>(IpamService);
  });

  it('should create an IP pool with total IP calculation', async () => {
    const pool = await service.createPool(
      {
        name: 'PPPoE Pool',
        subnet: '10.0.0.0/24',
        startIp: '10.0.0.10',
        endIp: '10.0.0.20',
        type: IpPoolType.PPPOE,
      },
      'tenant-1',
      'user-1',
    );

    expect(pool).toBeDefined();
    expect(pool.totalIps).toBe(11);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should auto-allocate next available IP address from pool', async () => {
    mockPoolRepo.findOne.mockResolvedValue({
      id: 'pool-1',
      tenantId: 'tenant-1',
      startIp: '192.168.10.10',
      endIp: '192.168.10.15',
      allocatedIps: 0,
      reservedIps: 0,
    });

    const alloc = await service.allocateIp(
      'pool-1',
      {
        allocatedToType: 'subscriber',
        allocatedToId: 'sub-1',
      },
      'tenant-1',
      'user-1',
    );

    expect(alloc.ipAddress).toBe('192.168.10.10');
    expect(alloc.status).toBe(IpAllocationStatus.ALLOCATED);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should reject allocation outside pool range', async () => {
    mockPoolRepo.findOne.mockResolvedValue({
      id: 'pool-1',
      tenantId: 'tenant-1',
      startIp: '192.168.10.10',
      endIp: '192.168.10.20',
    });

    await expect(
      service.allocateIp(
        'pool-1',
        { ipAddress: '192.168.10.50' },
        'tenant-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
