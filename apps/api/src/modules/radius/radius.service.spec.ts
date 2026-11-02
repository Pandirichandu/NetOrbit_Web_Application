import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RadiusService } from './radius.service';
import { RadiusUser, RadiusAccountStatus, RadiusAuthMethod } from './entities/radius-user.entity';
import { RadiusAccounting, RadiusAccountingStatusType } from './entities/radius-accounting.entity';
import { NasDevice } from '../nas/entities/nas-device.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import { AuditService } from '../../core/audit/audit.service';
import { encryptCredential } from './radius-crypto.util';

describe('RadiusService', () => {
  let service: RadiusService;

  const mockUserRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((u) => Promise.resolve({ id: 'ru-1', ...u })),
    findOne: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    softDelete: vi.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      getOne: vi.fn(),
    }),
  };

  const mockAcctRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((a) => Promise.resolve({ id: 'acct-1', ...a })),
    findOne: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      getOne: vi.fn(),
      getCount: vi.fn().mockResolvedValue(0),
      getRawOne: vi.fn().mockResolvedValue({ totalIn: '1000000', totalOut: '500000' }),
    }),
  };

  const mockNasRepo = {
    findOne: vi.fn(),
    count: vi.fn().mockResolvedValue(1),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockSubscriberRepo = {
    findOne: vi.fn(),
  };

  const mockPackageRepo = {
    findOne: vi.fn(),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RadiusService,
        { provide: getRepositoryToken(RadiusUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(RadiusAccounting), useValue: mockAcctRepo },
        { provide: getRepositoryToken(NasDevice), useValue: mockNasRepo },
        { provide: getRepositoryToken(Subscriber), useValue: mockSubscriberRepo },
        { provide: getRepositoryToken(Package), useValue: mockPackageRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<RadiusService>(RadiusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticate (RFC 2865)', () => {
    const password = 'SecretPassword123!';
    const passwordHash = bcrypt.hashSync(password, 10);
    const cleartextPassword = encryptCredential(password);

    const testNas = {
      id: 'nas-1',
      tenantId: 'tenant-1',
      name: 'Main MikroTik',
      ipAddress: '10.0.0.1',
      secret: 'radsecret123',
      isActive: true,
    };

    const testUser = {
      id: 'ru-1',
      tenantId: 'tenant-1',
      username: 'john_broadband',
      passwordHash,
      cleartextPassword,
      authType: RadiusAuthMethod.PAP,
      status: RadiusAccountStatus.ACTIVE,
      simultaneousUse: 1,
      subscriber: {
        id: 'sub-1',
        status: SubscriberStatus.ACTIVE,
        package: {
          name: 'Pro 100M',
          downloadSpeedMbps: 100,
          uploadSpeedMbps: 50,
          isActive: true,
        },
      },
    };

    it('should successfully authenticate PAP user and return Access-Accept with rate limits', async () => {
      mockNasRepo.findOne.mockResolvedValue(testNas);
      mockUserRepo.findOne.mockResolvedValue(testUser);
      mockAcctRepo.count.mockResolvedValue(0);

      const response = await service.authenticate({
        username: 'john_broadband',
        password: 'SecretPassword123!',
        nasIpAddress: '10.0.0.1',
        sharedSecret: 'radsecret123',
      });

      expect(response.code).toBe('Access-Accept');
      expect(response.rateLimit).toBe('50M/100M');
      expect(response.attributes?.['Mikrotik-Rate-Limit']).toBe('50M/100M');
    });

    it('should reject invalid password', async () => {
      mockNasRepo.findOne.mockResolvedValue(testNas);
      mockUserRepo.findOne.mockResolvedValue(testUser);

      const response = await service.authenticate({
        username: 'john_broadband',
        password: 'WrongPassword!',
        nasIpAddress: '10.0.0.1',
      });

      expect(response.code).toBe('Access-Reject');
      expect(response.replyMessage).toContain('Invalid credentials');
    });

    it('should authenticate CHAP credentials correctly (RFC 2865 §5.3)', async () => {
      mockNasRepo.findOne.mockResolvedValue(testNas);
      mockUserRepo.findOne.mockResolvedValue(testUser);
      mockAcctRepo.count.mockResolvedValue(0);

      const ident = 1;
      const challenge = crypto.randomBytes(16);
      const hash = crypto
        .createHash('md5')
        .update(Buffer.from([ident]))
        .update(Buffer.from(password, 'utf8'))
        .update(challenge)
        .digest('hex');

      const chapPassword = '01' + hash;

      const response = await service.authenticate({
        username: 'john_broadband',
        chapPassword,
        chapChallenge: challenge.toString('hex'),
        nasIpAddress: '10.0.0.1',
      });

      expect(response.code).toBe('Access-Accept');
    });

    it('should reject authentication if subscriber is suspended', async () => {
      mockNasRepo.findOne.mockResolvedValue(testNas);
      mockUserRepo.findOne.mockResolvedValue({
        ...testUser,
        subscriber: {
          ...testUser.subscriber,
          status: SubscriberStatus.SUSPENDED,
        },
      });

      const response = await service.authenticate({
        username: 'john_broadband',
        password: 'SecretPassword123!',
        nasIpAddress: '10.0.0.1',
      });

      expect(response.code).toBe('Access-Reject');
      expect(response.replyMessage).toContain('suspended');
    });
  });

  describe('accounting (RFC 2866)', () => {
    it('should process Accounting-Start and record session', async () => {
      mockNasRepo.findOne.mockResolvedValue({
        id: 'nas-1',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.1',
        isActive: true,
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 'ru-1', tenantId: 'tenant-1', subscriberId: 'sub-1' });
      mockAcctRepo.findOne.mockResolvedValue(null);

      const result = await service.processAccounting({
        acctStatusType: RadiusAccountingStatusType.START,
        username: 'john_broadband',
        acctSessionId: 'sess-abc-123',
        nasIpAddress: '10.0.0.1',
        framedIpAddress: '100.64.0.15',
      });

      expect(result.code).toBe('Accounting-Response');
      expect(result.status).toBe('ok');
      expect(mockAcctRepo.save).toHaveBeenCalled();
    });
  });
});
