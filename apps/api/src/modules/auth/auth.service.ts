import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import { User, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordHistory } from './entities/password-history.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailService } from './email.service';
import { RedisClientService } from '../../core/cache/redis-client.service';
import { AuditService } from '../../core/audit/audit.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepo: Repository<PasswordHistory>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly redis: RedisClientService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, pass: string, tenantSlug?: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    // Check Redis lockout first
    const lockoutKey = `lockout:${normalizedEmail}`;
    const isLocked = await this.redis.get(lockoutKey);
    if (isLocked) {
      throw new ForbiddenException(`Account temporarily locked. Please try again after ${LOCKOUT_MINUTES} minutes.`);
    }

    let tenantId: string | null = null;
    if (tenantSlug) {
      const tenant = await this.userRepo.manager.findOne(Tenant, { where: { slug: tenantSlug } });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.mfaSecret')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.email) = :email', { email: normalizedEmail });

    if (tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is suspended or inactive');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      const attemptsKey = `failed_login:${normalizedEmail}`;
      const failedCount = await this.redis.increment(attemptsKey, 900);

      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        await this.redis.set(lockoutKey, '1', LOCKOUT_MINUTES * 60);
        await this.redis.del(attemptsKey);
        this.logger.warn(`User ${normalizedEmail} locked out due to ${MAX_FAILED_ATTEMPTS} failed attempts`);
        throw new ForbiddenException(`Too many failed login attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`);
      }

      return null;
    }

    // Reset failed counter on successful password match
    await this.redis.del(`failed_login:${normalizedEmail}`);
    return user;
  }

  async login(user: User, ip?: string, userAgent?: string) {
    if (user.mfaEnabled && user.mfaSecret) {
      const mfaToken = uuidv4();
      await this.redis.set(`mfa_pending:${mfaToken}`, user.id, 300); // 5 min
      return {
        requiresMfa: true,
        mfaToken,
      };
    }

    return this.generateAuthTokens(user, ip, userAgent);
  }

  async verifyMfaLogin(mfaToken: string, code: string, ip?: string, userAgent?: string) {
    const userId = await this.redis.get(`mfa_pending:${mfaToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired MFA session');
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('User or MFA configuration missing');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    await this.redis.del(`mfa_pending:${mfaToken}`);
    return this.generateAuthTokens(user, ip, userAgent, true);
  }

  private async generateAuthTokens(user: User, ip?: string, userAgent?: string, mfaVerified = false) {
    const roles: string[] = [];
    const permissions = new Set<string>();

    if (user.roles) {
      for (const role of user.roles) {
        roles.push(role.slug);
        if (role.permissions) {
          for (const perm of role.permissions) {
            permissions.add(`${perm.resource}:${perm.action}`);
          }
        }
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      roles,
      permissions: Array.from(permissions),
      mfaVerified,
    };

    const privateKey = this.config.get<string>('JWT_PRIVATE_KEY', '').replace(/\\n/g, '\n');
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
    const accessToken = this.jwtService.sign(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn: accessExpiry as any,
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    const refreshToken = this.refreshRepo.create({
      userId: user.id,
      tenantId: user.tenantId,
      token: refreshTokenValue,
      userAgent: userAgent || null,
      ipAddress: ip || null,
      expiresAt,
    });
    await this.refreshRepo.save(refreshToken);

    // Also cache in Redis for rapid lookup & revocation
    await this.redis.set(`refresh:${refreshTokenValue}`, user.id, refreshExpiryDays * 24 * 3600);

    // Update user last login
    user.lastLoginAt = new Date();
    await this.userRepo.update(user.id, { lastLoginAt: user.lastLoginAt });

    // Write audit log
    await this.auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      userEmail: user.email,
      action: 'auth.login',
      resourceType: 'auth',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
      details: { mfaVerified },
    });

    return {
      tokens: {
        accessToken,
        refreshToken: refreshTokenValue,
        tokenType: 'Bearer',
        expiresIn: 900,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        roles,
        permissions: Array.from(permissions),
        mfaEnabled: user.mfaEnabled,
        status: user.status,
      },
    };
  }

  async refreshTokens(tokenString: string, ip?: string, userAgent?: string) {
    const existing = await this.refreshRepo.findOne({
      where: { token: tokenString },
    });

    if (!existing || existing.isRevoked || existing.isExpired) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (rotation)
    existing.revokedAt = new Date();
    await this.refreshRepo.save(existing);
    await this.redis.del(`refresh:${tokenString}`);

    const user = await this.userRepo.findOne({
      where: { id: existing.userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account no longer active');
    }

    return this.generateAuthTokens(user, ip, userAgent);
  }

  async logout(userId: string, tokenString?: string) {
    if (tokenString) {
      await this.refreshRepo.update({ token: tokenString }, { revokedAt: new Date() });
      await this.redis.del(`refresh:${tokenString}`);
    }
    return { success: true };
  }

  async setupMfa(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = authenticator.generateSecret();
    const appName = 'NetOrbit';
    const otpauth = authenticator.keyuri(user.email, appName, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Store pending secret in Redis for 10 minutes
    await this.redis.set(`mfa_setup:${userId}`, secret, 600);

    return {
      secret,
      qrCodeUrl,
    };
  }

  async verifyMfaSetup(userId: string, code: string) {
    const secret = await this.redis.get(`mfa_setup:${userId}`);
    if (!secret) {
      throw new BadRequestException('MFA setup session expired. Please start again.');
    }

    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepo.update(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
    });

    await this.redis.del(`mfa_setup:${userId}`);
    return { success: true, message: 'Two-factor authentication successfully enabled' };
  }

  async forgotPassword(email: string, _tenantSlug?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      // Return success to avoid email enumeration
      return { success: true, message: 'If the email exists, a password reset link has been sent' };
    }

    const token = uuidv4();
    await this.redis.set(`reset:${token}`, user.id, 3600); // 1 hour TTL
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { success: true, message: 'Password reset link sent to your registered email' };
  }

  async resetPassword(token: string, newPass: string) {
    const userId = await this.redis.get(`reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Password reset link is invalid or has expired');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Password history check (last 5 passwords cannot be reused)
    const recentHistories = await this.passwordHistoryRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    for (const history of recentHistories) {
      const match = await bcrypt.compare(newPass, history.passwordHash);
      if (match) {
        throw new BadRequestException('You cannot reuse any of your last 5 passwords');
      }
    }

    const saltRounds = this.config.get<number>('BCRYPT_ROUNDS', 10);
    const newHash = await bcrypt.hash(newPass, saltRounds);

    // Save to history
    await this.passwordHistoryRepo.save(
      this.passwordHistoryRepo.create({
        userId: user.id,
        passwordHash: newHash,
      }),
    );

    // Update user password
    user.passwordHash = newHash;
    user.forcePasswordChange = false;
    await this.userRepo.save(user);

    // Invalidate reset token and revoke all user sessions
    await this.redis.del(`reset:${token}`);
    await this.refreshRepo.update({ userId: user.id }, { revokedAt: new Date() });

    return { success: true, message: 'Password has been successfully reset' };
  }
}
