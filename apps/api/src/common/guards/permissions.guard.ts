import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ICurrentUser } from '../interfaces/current-user.interface';
import { SystemRole } from '../enums/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required — allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ICurrentUser = request.user;

    if (!user) {
      throw new ForbiddenException('No user context found');
    }

    // Super Admin bypasses all permission checks
    if (
      user.isSuperAdmin ||
      user.roles.includes(SystemRole.SUPER_ADMINISTRATOR)
    ) {
      return true;
    }

    // Check if user has all required permissions
    const hasAll = requiredPermissions.every((perm) => user.permissions.includes(perm));

    if (!hasAll) {
      const missing = requiredPermissions.filter((p) => !user.permissions.includes(p));
      throw new ForbiddenException(
        `Missing required permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
