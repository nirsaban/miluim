import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role hierarchy and permissions:
 * - ADMIN: Full system access (bypasses all role checks)
 * - LOGISTICS: Manages shifts, zones, operational links
 * - OFFICER: Manages their department, leave requests from department
 * - COMMANDER: Like SOLDIER + receives command-level notifications
 * - SOLDIER: Basic user access
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('אין הרשאה לבצע פעולה זו');
    }

    // ADMIN always has access to everything
    if (user.role === 'ADMIN') {
      return true;
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('אין הרשאה לבצע פעולה זו');
    }

    return true;
  }

  /**
   * Helper to check if a role meets a minimum level
   * Hierarchy: ADMIN > LOGISTICS = OFFICER > COMMANDER > SOLDIER
   */
  static isAtLeast(userRole: UserRole, minRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      ADMIN: 100,
      LOGISTICS: 50,
      OFFICER: 50,
      COMMANDER: 20,
      SOLDIER: 10,
    };
    return hierarchy[userRole] >= hierarchy[minRole];
  }
}
