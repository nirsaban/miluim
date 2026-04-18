import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export interface CompanyScopedUser {
  id: string;
  role: UserRole;
  companyId?: string | null;
  battalionId?: string | null;
}

@Injectable()
export class CompanyScopeService {
  /**
   * Returns a Prisma where-clause filter for company scoping.
   * - BATTALION_ADMIN / SYSTEM_TECHNICAL: no filter (sees all)
   * - All others: filter by user's companyId
   */
  getCompanyFilter(user: CompanyScopedUser): { companyId?: string } {
    if (user.role === 'BATTALION_ADMIN' || user.role === 'SYSTEM_TECHNICAL') {
      return {};
    }
    if (!user.companyId) {
      return {};
    }
    return { companyId: user.companyId };
  }

  /**
   * For battalion admin, optionally filter to a specific company.
   */
  getCompanyFilterWithOverride(
    user: CompanyScopedUser,
    targetCompanyId?: string,
  ): { companyId?: string } {
    if (user.role === 'BATTALION_ADMIN' || user.role === 'SYSTEM_TECHNICAL') {
      return targetCompanyId ? { companyId: targetCompanyId } : {};
    }
    return user.companyId ? { companyId: user.companyId } : {};
  }

  /**
   * Validates that user has access to the given companyId.
   */
  assertCompanyAccess(user: CompanyScopedUser, companyId: string): void {
    if (user.role === 'BATTALION_ADMIN' || user.role === 'SYSTEM_TECHNICAL') {
      return;
    }
    if (user.companyId !== companyId) {
      throw new ForbiddenException('אין גישה לפלוגה זו');
    }
  }

  /**
   * Check if user is a battalion-level admin
   */
  isBattalionLevel(user: CompanyScopedUser): boolean {
    return user.role === 'BATTALION_ADMIN' || user.role === 'SYSTEM_TECHNICAL';
  }
}
