import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VouchersService } from './vouchers.service';
import { Voucher, VoucherStatus } from './entities/voucher.entity';
import { Package } from '../packages/entities/package.entity';
import { Subscriber } from '../subscribers/entities/subscriber.entity';
import { AuditService } from '../../core/audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('VouchersService', () => {
  let service: VouchersService;

  const mockVoucherRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((v) =>
      Array.isArray(v)
        ? Promise.resolve(v.map((item, i) => ({ id: `v-${i}`, ...item })))
        : Promise.resolve({ id: 'v-1', ...v }),
    ),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'v-1',
            code: 'NET-ABCD-1234',
            status: VoucherStatus.ACTIVE,
            durationMinutes: 1440,
            tenantId: 'tenant-1',
          },
        ],
        1,
      ]),
    }),
  };

  const mockPackageRepo = {
    findOne: vi.fn(),
  };

  const mockSubscriberRepo = {
    findOne: vi.fn(),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        { provide: getRepositoryToken(Voucher), useValue: mockVoucherRepo },
        { provide: getRepositoryToken(Package), useValue: mockPackageRepo },
        { provide: getRepositoryToken(Subscriber), useValue: mockSubscriberRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
  });

  it('should batch generate vouchers with unique cryptographically random codes', async () => {
    const vouchers = await service.generate(
      {
        count: 5,
        durationMinutes: 720,
        price: 10,
        prefix: 'HOT',
      },
      'tenant-1',
      'user-1',
    );

    expect(vouchers).toHaveLength(5);
    expect(vouchers[0].code).toMatch(/^HOT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(vouchers[0].status).toBe(VoucherStatus.ACTIVE);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should successfully redeem an active voucher', async () => {
    mockVoucherRepo.findOne.mockResolvedValue({
      id: 'v-1',
      tenantId: 'tenant-1',
      code: 'NET-ABCD-1234',
      status: VoucherStatus.ACTIVE,
      durationMinutes: 1440,
      usedCount: 0,
      maxUses: 1,
      package: { name: 'Hotspot 1 Day', downloadSpeedMbps: 20, uploadSpeedMbps: 10 },
    });

    const result = await service.redeem(
      {
        code: 'NET-ABCD-1234',
        macAddress: '00:11:22:33:44:55',
      },
      'tenant-1',
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(result.voucher.status).toBe(VoucherStatus.REDEEMED);
    expect(result.bandwidthProfile.downloadSpeedMbps).toBe(20);
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('should reject already redeemed voucher', async () => {
    mockVoucherRepo.findOne.mockResolvedValue({
      id: 'v-1',
      tenantId: 'tenant-1',
      code: 'NET-ABCD-1234',
      status: VoucherStatus.REDEEMED,
      usedCount: 1,
      maxUses: 1,
    });

    await expect(
      service.redeem({ code: 'NET-ABCD-1234' }, 'tenant-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
