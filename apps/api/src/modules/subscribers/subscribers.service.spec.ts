import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscribersService } from './subscribers.service';
import { Subscriber, SubscriberStatus } from './entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { AuditService } from '../../core/audit/audit.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('SubscribersService', () => {
  let service: SubscribersService;

  const mockSubscriberRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((sub) =>
      Promise.resolve({
        id: 'sub-123',
        ...sub,
        fullName: `${sub.firstName} ${sub.lastName}`,
      }),
    ),
    softDelete: vi.fn().mockResolvedValue({ affected: 1 }),
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
            id: 'sub-123',
            accountNumber: 'SUB-1001',
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@example.com',
            tenantId: 'tenant-1',
            status: SubscriberStatus.ACTIVE,
          },
        ],
        1,
      ]),
      getOne: vi.fn().mockResolvedValue({
        id: 'sub-123',
        accountNumber: 'SUB-1001',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@example.com',
        tenantId: 'tenant-1',
        status: SubscriberStatus.ACTIVE,
        package: { id: 'pkg-1', name: 'Fiber 100M', validityDays: 30 },
      }),
    }),
  };

  const mockPackageRepo = {
    findOne: vi.fn(),
  };

  const mockUserRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((u) => u),
    save: vi.fn().mockImplementation((u) => Promise.resolve({ id: 'user-sub-1', ...u })),
  };

  const mockRoleRepo = {
    findOne: vi.fn().mockResolvedValue({ id: 'role-customer', slug: 'customer' }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: getRepositoryToken(Subscriber), useValue: mockSubscriberRepo },
        { provide: getRepositoryToken(Package), useValue: mockPackageRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create subscriber with package and record audit log', async () => {
    mockPackageRepo.findOne.mockResolvedValue({
      id: 'pkg-1',
      tenantId: 'tenant-1',
      validityDays: 30,
    });
    mockSubscriberRepo.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@example.com',
        phone: '+1-555-0101',
        addressLine1: '8404 Tech Center',
        city: 'LA',
        state: 'CA',
        postalCode: '90001',
        username: 'sarah_connor',
        packageId: 'pkg-1',
      },
      'tenant-1',
      'user-admin',
      'admin@tenant.com',
    );

    expect(result).toBeDefined();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'subscribers.create',
        resourceType: 'subscriber',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('should reject assigning package from another tenant', async () => {
    mockPackageRepo.findOne.mockResolvedValue(null); // Not found in tenant-1

    await expect(
      service.create(
        {
          firstName: 'Bad',
          lastName: 'Package',
          email: 'bad@example.com',
          phone: '+1-555-0000',
          addressLine1: '123 Fake St',
          city: 'LA',
          state: 'CA',
          postalCode: '90001',
          username: 'bad_user',
          packageId: 'cross-tenant-pkg',
        },
        'tenant-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent duplicate username in same tenant', async () => {
    mockSubscriberRepo.findOne.mockResolvedValue({ id: 'existing', username: 'duplicate_user' });

    await expect(
      service.create(
        {
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'dup@example.com',
          phone: '+1-555-0000',
          addressLine1: '123 Fake St',
          city: 'LA',
          state: 'CA',
          postalCode: '90001',
          username: 'duplicate_user',
        },
        'tenant-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should transition subscriber status to suspended with audit', async () => {
    const updated = await service.changeStatus(
      'sub-123',
      { status: SubscriberStatus.SUSPENDED, reason: 'Overdue bill' },
      'tenant-1',
      'admin-id',
      'admin@tenant.com',
    );

    expect(updated.status).toBe(SubscriberStatus.SUSPENDED);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'subscribers.status_changed',
        newValues: expect.objectContaining({ status: SubscriberStatus.SUSPENDED }),
      }),
    );
  });
});
