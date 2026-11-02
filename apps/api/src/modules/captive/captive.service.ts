import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { CaptiveAuthDto, CaptiveAuthMethod } from './dto/captive.dto';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class CaptiveService {
  private readonly logger = new Logger(CaptiveService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    private readonly vouchersService: VouchersService,
    private readonly auditService: AuditService,
  ) {}

  async getTenantPortalConfig(slug: string) {
    const tenant = await this.tenantRepo.findOne({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Captive portal for '${slug}' not found`);
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.config?.branding?.logo || null,
      primaryColor: tenant.config?.branding?.primaryColor || '#6366f1',
      allowedAuthMethods: [CaptiveAuthMethod.VOUCHER, CaptiveAuthMethod.SUBSCRIBER, CaptiveAuthMethod.OTP],
      termsUrl: '#',
      supportPhone: null,
      supportEmail: null,
    };
  }

  async authenticate(
    dto: CaptiveAuthDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    authenticated: boolean;
    sessionToken: string;
    authMethod: CaptiveAuthMethod;
    expiresInSeconds: number;
    redirectUrl?: string;
    bandwidthProfile?: any;
    user?: any;
  }> {
    const tenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${dto.tenantSlug}' not found`);
    }

    const timestamp = Date.now();
    const sessionToken = `HS-SESS-${Buffer.from(`${tenant.id}-${timestamp}-${Math.random()}`).toString('base64url').substring(0, 32)}`;

    if (dto.authMethod === CaptiveAuthMethod.VOUCHER) {
      if (!dto.voucherCode) {
        throw new BadRequestException('Voucher code is required for voucher authentication');
      }

      const redeemResult = await this.vouchersService.redeem(
        {
          code: dto.voucherCode,
          pin: dto.voucherPin,
          macAddress: dto.macAddress,
        },
        tenant.id,
      );

      const durationMinutes = redeemResult.voucher.durationMinutes || 1440;

      this.auditService.log({
        action: 'captive:voucher_login',
        resourceType: 'captive_portal',
        tenantId: tenant.id,
        ipAddress: dto.clientIp || ipAddress,
        userAgent,
        details: {
          code: dto.voucherCode,
          macAddress: dto.macAddress,
          durationMinutes,
        },
      });

      return {
        authenticated: true,
        sessionToken,
        authMethod: CaptiveAuthMethod.VOUCHER,
        expiresInSeconds: durationMinutes * 60,
        redirectUrl: 'https://www.google.com',
        bandwidthProfile: redeemResult.bandwidthProfile,
        user: {
          type: 'voucher',
          code: redeemResult.voucher.code,
          durationMinutes,
        },
      };
    }

    if (dto.authMethod === CaptiveAuthMethod.SUBSCRIBER) {
      if (!dto.username || !dto.password) {
        throw new BadRequestException('Username and password are required');
      }

      const subscriber = await this.subscriberRepo
        .createQueryBuilder('subscriber')
        .addSelect('subscriber.passwordHash')
        .leftJoinAndSelect('subscriber.package', 'package')
        .where('subscriber.tenantId = :tenantId', { tenantId: tenant.id })
        .andWhere('subscriber.username = :username', { username: dto.username })
        .getOne();

      if (!subscriber) {
        throw new UnauthorizedException('Invalid subscriber credentials');
      }

      // Verify password
      const passwordMatch = subscriber.passwordHash
        ? await bcrypt.compare(dto.password, subscriber.passwordHash)
        : false;

      if (!passwordMatch && subscriber.passwordHash !== dto.password) {
        throw new UnauthorizedException('Invalid subscriber credentials');
      }

      if (subscriber.status !== SubscriberStatus.ACTIVE) {
        throw new UnauthorizedException(`Account is ${subscriber.status}. Please renew your subscription.`);
      }

      this.auditService.log({
        action: 'captive:subscriber_login',
        resourceType: 'captive_portal',
        tenantId: tenant.id,
        ipAddress: dto.clientIp || ipAddress,
        userAgent,
        details: {
          subscriberId: subscriber.id,
          username: subscriber.username,
          macAddress: dto.macAddress,
        },
      });

      return {
        authenticated: true,
        sessionToken,
        authMethod: CaptiveAuthMethod.SUBSCRIBER,
        expiresInSeconds: 86400, // 24 hours standard session
        redirectUrl: 'https://www.google.com',
        bandwidthProfile: subscriber.package ? {
          packageName: subscriber.package.name,
          downloadSpeedMbps: subscriber.package.downloadSpeedMbps,
          uploadSpeedMbps: subscriber.package.uploadSpeedMbps,
        } : null,
        user: {
          type: 'subscriber',
          id: subscriber.id,
          username: subscriber.username,
          fullName: `${subscriber.firstName} ${subscriber.lastName}`,
        },
      };
    }

    throw new BadRequestException(`Unsupported authentication method: ${dto.authMethod}`);
  }
}
