import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DhcpService } from './dhcp.service';
import { DhcpScope, DhcpScopeStatus } from './entities/dhcp-scope.entity';
import { DhcpLease, DhcpLeaseStatus } from './entities/dhcp-lease.entity';
import { IpPool } from '../ipam/entities/ip-pool.entity';
import { IpamService } from '../ipam/ipam.service';
import { AuditService } from '../../core/audit/audit.service';
import { ConflictException } from '@nestjs/common';

describe('DhcpService', () => {
  let service: DhcpService;

  const mockScopeRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((scope) => Promise.resolve({ id: 'scope-1', ...scope })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'scope-1',
          name: 'Main LAN Scope',
          interfaceName: 'ether2-lan',
          status: DhcpScopeStatus.ACTIVE,
          tenantId: 'tenant-1',
        },
      ]),
    }),
  };

  const mockLeaseRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((lease) => Promise.resolve({ id: 'lease-1', ...lease })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'lease-1',
            ipAddress: '192.168.10.50',
            macAddress: 'b8:27:eb:11:22:33',
            isStatic: true,
            status: DhcpLeaseStatus.ACTIVE,
            tenantId: 'tenant-1',
          },
        ],
        1,
      ]),
    }),
  };

  const mockPoolRepo = {
    findOne: vi.fn(),
  };

  const mockIpamService = {
    allocateIp: vi.fn().mockResolvedValue({ id: 'alloc-1' }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DhcpService,
        { provide: getRepositoryToken(DhcpScope), useValue: mockScopeRepo },
        { provide: getRepositoryToken(DhcpLease), useValue: mockLeaseRepo },
        { provide: getRepositoryToken(IpPool), useValue: mockPoolRepo },
        { provide: IpamService, useValue: mockIpamService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DhcpService>(DhcpService);
  });

  it('should create a DHCP scope', async () => {
    const scope = await service.createScope(
      {
        name: 'Office Wi-Fi Scope',
        interfaceName: 'wlan1',
        leaseTimeSeconds: 43200,
      },
      'tenant-1',
      'user-1',
    );

    expect(scope).toBeDefined();
    expect(scope.name).toBe('Office Wi-Fi Scope');
    expect(scope.status).toBe(DhcpScopeStatus.ACTIVE);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should create a static MAC-to-IP reservation', async () => {
    mockScopeRepo.findOne.mockResolvedValue({
      id: 'scope-1',
      tenantId: 'tenant-1',
      poolId: null,
    });
    mockLeaseRepo.findOne.mockResolvedValue(null);

    const lease = await service.createStaticReservation(
      {
        scopeId: 'scope-1',
        ipAddress: '192.168.10.55',
        macAddress: 'aa:bb:cc:dd:ee:ff',
        hostname: 'printer.lan',
      },
      'tenant-1',
      'user-1',
    );

    expect(lease).toBeDefined();
    expect(lease.isStatic).toBe(true);
    expect(lease.status).toBe(DhcpLeaseStatus.ACTIVE);
    expect(lease.ipAddress).toBe('192.168.10.55');
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should reject duplicate MAC reservation in same scope', async () => {
    mockScopeRepo.findOne.mockResolvedValue({
      id: 'scope-1',
      tenantId: 'tenant-1',
    });
    mockLeaseRepo.findOne.mockResolvedValue({
      id: 'existing-lease',
      macAddress: 'aa:bb:cc:dd:ee:ff',
      status: DhcpLeaseStatus.ACTIVE,
    });

    await expect(
      service.createStaticReservation(
        {
          scopeId: 'scope-1',
          ipAddress: '192.168.10.60',
          macAddress: 'aa:bb:cc:dd:ee:ff',
        },
        'tenant-1',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
