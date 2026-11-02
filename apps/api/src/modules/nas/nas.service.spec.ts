import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NasService } from './nas.service';
import { NasDevice, NasDeviceStatus, NasVendorType } from './entities/nas-device.entity';
import { AuditService } from '../../core/audit/audit.service';

describe('NasService', () => {
  let service: NasService;

  const mockNasRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((nas) => Promise.resolve({ id: 'nas-123', ...nas })),
    findOne: vi.fn(),
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
            id: 'nas-1',
            tenantId: 'tenant-1',
            name: 'Core MikroTik CCR2004',
            ipAddress: '192.168.1.1',
            secret: 'SuperSecret123',
            type: NasVendorType.MIKROTIK,
            port: 1812,
            coaPort: 3799,
            isActive: true,
            status: NasDeviceStatus.ACTIVE,
            createdAt: new Date(),
          },
        ],
        1,
      ]),
      getOne: vi.fn().mockResolvedValue({
        id: 'nas-1',
        tenantId: 'tenant-1',
        name: 'Core MikroTik CCR2004',
        ipAddress: '192.168.1.1',
        secret: 'SuperSecret123',
        type: NasVendorType.MIKROTIK,
        port: 1812,
        coaPort: 3799,
        isActive: true,
        status: NasDeviceStatus.ACTIVE,
        createdAt: new Date(),
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
        NasService,
        { provide: getRepositoryToken(NasDevice), useValue: mockNasRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<NasService>(NasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list NAS devices and mask shared secrets', async () => {
    const result = await service.findAll({}, 'tenant-1', false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].secret).toBeUndefined();
  });

  it('should create a NAS device and log audit trail', async () => {
    mockNasRepo.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        name: 'Edge Router Ubiquiti',
        ipAddress: '10.0.0.1',
        secret: 'EdgeSecretKey99',
        type: NasVendorType.UBIQUITI,
      },
      'tenant-1',
      'user-1',
      'admin@isp.com',
    );

    expect(result.id).toBe('nas-123');
    expect(mockNasRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'nas.create',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('should toggle NAS active status', async () => {
    const result = await service.toggleStatus('nas-1', 'tenant-1', 'user-1', 'admin@isp.com');
    expect(result).toBeDefined();
    expect(mockNasRepo.save).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'nas.status_changed' }),
    );
  });

  it('should remove a NAS device and record audit log', async () => {
    await service.remove('nas-1', 'tenant-1', 'user-1', 'admin@isp.com');
    expect(mockNasRepo.softDelete).toHaveBeenCalledWith('nas-1');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'nas.delete' }),
    );
  });
});
