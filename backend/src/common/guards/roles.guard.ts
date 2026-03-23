import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, MilitaryRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { isAdminMilitaryRole, isDutyOfficer } from '../constants/permissions';

/**
 * Role hierarchy and permissions:
 *
 * Admin-level (full access) - MilitaryRole determines this:
 *   - PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT → ADMIN
 *
 * Operations/Logistics (limited admin access):
 *   - OPERATIONS_NCO → LOGISTICS
 *   - Access: shifts, operational links, skills, zones, tasks
 *   - NO access: messages, forms, soldiers management, csv-import
 *
 * Department-scoped (OFFICER with department filter):
 *   - DUTY_OFFICER → OFFICER (department-scoped)
 *   - Access: dashboard/department, dashboard/shift-duty
 *   - Can approve: only their department's leave requests/forms
 *   - Department scoping is enforced in service layer
 *
 * Commander / Basic:
 *   - SQUAD_COMMANDER → COMMANDER (receives commander notifications)
 *   - FIGHTER → SOLDIER (basic user access)
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

    // ADMIN UserRole always has access to everything
    if (user.role === 'ADMIN') {
      return true;
    }

    // Admin-level military roles (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT)
    // also have full access regardless of their UserRole
    if (user.militaryRole && isAdminMilitaryRole(user.militaryRole)) {
      return true;
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('אין הרשאה לבצע פעולה זו');
    }

    // Note: Department-scoping for DUTY_OFFICER is enforced in service layer,
    // not in this guard. The guard only checks if the role is allowed.

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

  /**
   * Check if user has admin-level access (based on MilitaryRole or UserRole)
   */
  static hasAdminAccess(user: { role: UserRole; militaryRole?: MilitaryRole }): boolean {
    if (user.role === 'ADMIN') return true;
    if (user.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
    return false;
  }

  /**
   * Check if user is department-scoped (DUTY_OFFICER)
   */
  static isDepartmentScoped(user: { militaryRole?: MilitaryRole }): boolean {
    return user.militaryRole ? isDutyOfficer(user.militaryRole) : false;
  }
}
