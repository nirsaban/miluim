import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission } from '../constants/permissions';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('אין הרשאה לבצע פעולה זו');
    }

    if (!user.militaryRole) {
      throw new ForbiddenException('תפקיד צבאי לא מוגדר');
    }

    // Check if user has at least one of the required permissions
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      hasPermission(user.militaryRole, permission),
    );

    if (!hasRequiredPermission) {
      throw new ForbiddenException('אין הרשאה לבצע פעולה זו');
    }

    return true;
  }
}
