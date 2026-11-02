import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PackagesService } from './packages.service';
import { Package, PackageType, BillingCycle } from './entities/package.entity';
import { AuditService } from '../../core/audit/audit.service';
import { ConflictException } from '@nestjs/common';

describe('PackagesService', () => {
  let service: PackagesService;

  const mockPackageRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((pkg) => Promise.resolve({ id: 'pkg-123', ...pkg })),
    softDelete: vi.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'pkg-123',
            name: 'Fiber 100M',
            slug: 'fiber-100m',
            price: 49.99,
            downloadSpeedMbps: 100,
            uploadSpeedMbps: 50,
            tenantId: 'tenant-1',
            isActive: true,
          },
        ],
        1,
      ]),
      getOne: vi.fn().mockResolvedValue({
        id: 'pkg-123',
        name: 'Fiber 100M',
        slug: 'fiber-100m',
        price: 49.99,
        downloadSpeedMbps: 100,
        uploadSpeedMbps: 50,
        tenantId: 'tenant-1',
        isActive: true,
      }),
    }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: getRepositoryToken(Package), useValue: mockPackageRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a package and emit audit log', async () => {
    mockPackageRepo.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        name: 'Fiber Pro 200M',
        price: 59.99,
        validityDays: 30,
        downloadSpeedMbps: 200,
        uploadSpeedMbps: 100,
        type: PackageType.BROADBAND,
        billingCycle: BillingCycle.MONTHLY,
      },
      'tenant-1',
      'user-1',
      'admin@tenant.com',
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('pkg-123');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'packages.create',
        resourceType: 'package',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('should prevent duplicate slug in same tenant', async () => {
    mockPackageRepo.findOne.mockResolvedValue({ id: 'existing-pkg', slug: 'fiber-pro' });

    await expect(
      service.create(
        {
          name: 'Fiber Pro',
          slug: 'fiber-pro',
          price: 59.99,
          validityDays: 30,
          downloadSpeedMbps: 200,
          uploadSpeedMbps: 100,
        },
        'tenant-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should list packages strictly scoped to tenant', async () => {
    const res = await service.findAll({ page: 1, limit: 10 } as any, 'tenant-1');
    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
    expect(mockPackageRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should activate and deactivate a package', async () => {
    const activated = await service.activate('pkg-123', 'tenant-1');
    expect(activated.isActive).toBe(true);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'packages.activate' }),
    );

    const deactivated = await service.deactivate('pkg-123', 'tenant-1');
    expect(deactivated.isActive).toBe(false);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'packages.deactivate' }),
    );
  });
});
