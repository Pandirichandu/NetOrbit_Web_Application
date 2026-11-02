import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant, TenantPlan } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { AuditService } from '../../core/audit/audit.service';

describe('TenantsService', () => {
  let service: TenantsService;

  const mockTenantRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((tenant) => Promise.resolve({ id: 'tenant-123', ...tenant })),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockUserRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((u) => Promise.resolve({ id: 'user-admin-1', ...u })),
  };

  const mockRoleRepo = {
    findOne: vi.fn().mockResolvedValue({ id: 'role-ta', slug: 'tenant_administrator' }),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create tenant and bootstrap tenant administrator', async () => {
    mockTenantRepo.findOne.mockResolvedValue(null);

    const result = await service.create({
      name: 'SkyNet Broadband',
      slug: 'skynet-isp',
      plan: TenantPlan.ENTERPRISE,
      adminEmail: 'admin@skynet.com',
      adminFirstName: 'Sarah',
      adminLastName: 'Connor',
      adminPassword: 'Password123!',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('tenant-123');
    expect(mockTenantRepo.save).toHaveBeenCalled();
    expect(mockUserRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalled();
  });
});
