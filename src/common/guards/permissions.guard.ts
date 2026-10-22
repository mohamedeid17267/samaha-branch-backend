import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Access denied: No user found');
    }

    // SUPER_ADMIN or HQ_ADMIN always has full access
    if (user.role?.name === RoleEnum.SUPER_ADMIN || user.role?.name === RoleEnum.HQ_ADMIN) {
      return true;
    }

    // If user has no permissions array, deny access
    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException(
        `Access denied: Required permissions [${requiredPermissions.join(', ')}]`,
      );
    }

    // Check if the user has AT LEAST ONE of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: Required permissions [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
