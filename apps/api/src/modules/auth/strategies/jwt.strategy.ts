import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../users/entities/user.entity';
import { CurrentUser } from '../../../common/interfaces/current-user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  mfaVerified?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    const rawKey = config.get<string>('JWT_PUBLIC_KEY', '');
    const publicKey = rawKey.replace(/\\n/g, '\n');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account inactive or not found');
    }

    const permissions = new Set<string>();
    const roles: string[] = [];

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

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      roles,
      permissions: Array.from(permissions),
      mfaVerified: payload.mfaVerified ?? false,
    };
  }
}
