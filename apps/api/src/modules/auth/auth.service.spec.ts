import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordHistory } from './entities/password-history.entity';
import { EmailService } from './email.service';
import { RedisClientService } from '../../core/cache/redis-client.service';
import { AuditService } from '../../core/audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepo = {
    findOne: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockImplementation((u) => Promise.resolve(u)),
    createQueryBuilder: vi.fn(),
    manager: {
      findOne: vi.fn(),
    },
  };

  const mockRefreshRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((t) => Promise.resolve({ id: 'rt-1', ...t })),
    findOne: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockPasswordHistoryRepo = {
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockResolvedValue({ id: 'ph-1' }),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mock.jwt.token'),
  };

  const mockConfig = {
    get: vi.fn().mockImplementation((key, defaultVal) => {
      if (key === 'JWT_PRIVATE_KEY') return 'mock-private-key';
      if (key === 'JWT_ACCESS_EXPIRY') return '15m';
      if (key === 'BCRYPT_ROUNDS') return 10;
      return defaultVal;
    }),
  };

  const mockEmail = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  };

  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(undefined),
    increment: vi.fn().mockResolvedValue(1),
  };

  const mockAudit = {
    log: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshRepo },
        { provide: getRepositoryToken(PasswordHistory), useValue: mockPasswordHistoryRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: RedisClientService, useValue: mockRedis },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate user with matching password', async () => {
    const hash = await bcrypt.hash('CorrectPassword123', 10);
    const mockUser = {
      id: 'u-1',
      email: 'user@isp.com',
      passwordHash: hash,
      status: UserStatus.ACTIVE,
      roles: [],
    };

    mockUserRepo.createQueryBuilder.mockReturnValue({
      addSelect: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(mockUser),
    });

    const result = await service.validateUser('user@isp.com', 'CorrectPassword123');
    expect(result).toBeDefined();
    expect(result?.email).toBe('user@isp.com');
  });

  it('should return null on incorrect password and increment failed attempts', async () => {
    const hash = await bcrypt.hash('CorrectPassword123', 10);
    const mockUser = {
      id: 'u-1',
      email: 'user@isp.com',
      passwordHash: hash,
      status: UserStatus.ACTIVE,
      roles: [],
    };

    mockUserRepo.createQueryBuilder.mockReturnValue({
      addSelect: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(mockUser),
    });

    const result = await service.validateUser('user@isp.com', 'WrongPassword!');
    expect(result).toBeNull();
    expect(mockRedis.increment).toHaveBeenCalled();
  });

  it('should issue tokens on login when MFA is disabled', async () => {
    const mockUser: any = {
      id: 'u-1',
      email: 'user@isp.com',
      firstName: 'Test',
      lastName: 'User',
      mfaEnabled: false,
      roles: [],
      status: UserStatus.ACTIVE,
      tenantId: 'tenant-1',
      isSuperAdmin: false,
    };

    const res = (await service.login(mockUser, '127.0.0.1', 'Mozilla')) as any;
    expect(res.tokens).toBeDefined();
    expect(res.tokens.accessToken).toBe('mock.jwt.token');
    expect(res.user.email).toBe('user@isp.com');
    expect(mockAudit.log).toHaveBeenCalled();
  });
});
