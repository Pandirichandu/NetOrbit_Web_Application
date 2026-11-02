import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService, SRS_PRIMARY_ROLES, ALL_PERMISSIONS } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RedisClientService } from '../../core/cache/redis-client.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockRoleRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((role) => Promise.resolve({ id: 'role-123', ...role })),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };

  const mockPermRepo = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((perm) => Promise.resolve({ id: 'perm-123', ...perm })),
  };

  const mockRedis = {
    del: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: getRepositoryToken(Permission), useValue: mockPermRepo },
        { provide: RedisClientService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should define the 6 SRS primary roles', () => {
    expect(SRS_PRIMARY_ROLES).toHaveLength(6);
    const slugs = SRS_PRIMARY_ROLES.map((r) => r.slug);
    expect(slugs).toContain('super_administrator');
    expect(slugs).toContain('tenant_administrator');
    expect(slugs).toContain('network_administrator');
    expect(slugs).toContain('billing_executive');
    expect(slugs).toContain('customer_support');
    expect(slugs).toContain('customer');
  });

  it('should define core permissions across domains', () => {
    expect(ALL_PERMISSIONS.length).toBeGreaterThan(15);
    const resources = new Set(ALL_PERMISSIONS.map((p) => p.resource));
    expect(resources.has('tenants')).toBe(true);
    expect(resources.has('users')).toBe(true);
    expect(resources.has('roles')).toBe(true);
    expect(resources.has('billing')).toBe(true);
    expect(resources.has('network')).toBe(true);
  });

  it('should return all permissions', async () => {
    const mockList = [{ id: 'p1', resource: 'users', action: 'read' }];
    mockPermRepo.find.mockResolvedValue(mockList);
    const result = await service.getAllPermissions();
    expect(result).toEqual(mockList);
  });
});
