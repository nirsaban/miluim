import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MilitaryRole, UserRole } from '@prisma/client';
import * as Papa from 'papaparse';

export interface CsvRow {
  personalId: string;
  fullName: string;
  militaryRole: string;
  departmentCode: string;
  phone?: string;
}

export interface PreviewResult {
  totalRows: number;
  validRows: CsvRow[];
  errors: { row: number; message: string }[];
}

export interface ImportResult {
  successCount: number;
  errors: { personalId: string; message: string }[];
}

@Injectable()
export class CsvImportService {
  constructor(private prisma: PrismaService) {}

  async previewCsv(fileBuffer: Buffer): Promise<PreviewResult> {
    const csvText = fileBuffer.toString('utf-8');

    const result = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      throw new BadRequestException('שגיאה בפענוח קובץ CSV');
    }

    const errors: { row: number; message: string }[] = [];
    const validRows: CsvRow[] = [];

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      const rowNum = i + 2; // +2 for header row and 1-based index

      // Validate required fields
      if (!row.personalId || row.personalId.trim() === '') {
        errors.push({ row: rowNum, message: 'חסר מספר אישי' });
        continue;
      }

      if (!row.fullName || row.fullName.trim() === '') {
        errors.push({ row: rowNum, message: 'חסר שם מלא' });
        continue;
      }

      if (!row.militaryRole || row.militaryRole.trim() === '') {
        errors.push({ row: rowNum, message: 'חסר תפקיד צבאי' });
        continue;
      }

      if (!row.departmentCode || row.departmentCode.trim() === '') {
        errors.push({ row: rowNum, message: 'חסר קוד מחלקה' });
        continue;
      }

      // Check if personalId already exists in database
      const existing = await this.prisma.user.findUnique({
        where: { personalId: row.personalId.trim() },
      });

      if (existing) {
        errors.push({ row: rowNum, message: `מספר אישי ${row.personalId} כבר קיים במערכת` });
        continue;
      }

      // Validate military role
      const militaryRole = this.mapRoleFromHebrew(row.militaryRole.trim());
      if (!militaryRole) {
        errors.push({ row: rowNum, message: `תפקיד לא תקין: ${row.militaryRole}` });
        continue;
      }

      // Check if department exists
      const department = await this.prisma.department.findFirst({
        where: { code: row.departmentCode.trim() },
      });

      if (!department) {
        errors.push({ row: rowNum, message: `מחלקה לא קיימת: ${row.departmentCode}` });
        continue;
      }

      validRows.push({
        personalId: row.personalId.trim(),
        fullName: row.fullName.trim(),
        militaryRole: row.militaryRole.trim(),
        departmentCode: row.departmentCode.trim(),
        phone: row.phone?.trim() || '',
      });
    }

    return {
      totalRows: result.data.length,
      validRows,
      errors,
    };
  }

  async importUsers(rows: CsvRow[]): Promise<ImportResult> {
    let successCount = 0;
    const errors: { personalId: string; message: string }[] = [];

    for (const row of rows) {
      try {
        // Find department
        const department = await this.prisma.department.findFirst({
          where: { code: row.departmentCode },
        });

        if (!department) {
          errors.push({ personalId: row.personalId, message: `מחלקה לא נמצאה: ${row.departmentCode}` });
          continue;
        }

        // Map role
        const militaryRole = this.mapRoleFromHebrew(row.militaryRole);
        if (!militaryRole) {
          errors.push({ personalId: row.personalId, message: `תפקיד לא תקין: ${row.militaryRole}` });
          continue;
        }

        const legacyRole = this.mapMilitaryRoleToLegacyRole(militaryRole);

        // Create user
        await this.prisma.user.create({
          data: {
            personalId: row.personalId,
            fullName: row.fullName,
            militaryRole,
            departmentId: department.id,
            phone: row.phone || '0000000000',
            // Temporary values - will be filled during registration
            email: `temp_${row.personalId}@pending.local`,
            passwordHash: '',
            idNumber: row.personalId,
            // Flags
            isPreApproved: true,
            isRegistered: false,
            isActive: true,
            // Legacy fields
            role: legacyRole,
            armyNumber: row.personalId,
          },
        });

        successCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          errors.push({ personalId: row.personalId, message: 'מספר אישי כבר קיים' });
        } else {
          errors.push({ personalId: row.personalId, message: error.message || 'שגיאה לא ידועה' });
        }
      }
    }

    return { successCount, errors };
  }

  private mapRoleFromHebrew(hebrewRole: string): MilitaryRole | null {
    const mapping: Record<string, MilitaryRole> = {
      'מפקד פלוגה': MilitaryRole.PLATOON_COMMANDER,
      'סמ״פ': MilitaryRole.SERGEANT_MAJOR,
      'סמ"פ': MilitaryRole.SERGEANT_MAJOR,
      'קמב״צ': MilitaryRole.OPERATIONS_SGT,
      'קמב"צ': MilitaryRole.OPERATIONS_SGT,
      'סמב״צ': MilitaryRole.OPERATIONS_NCO,
      'סמב"צ': MilitaryRole.OPERATIONS_NCO,
      'מ״מ': MilitaryRole.DUTY_OFFICER,
      'מ"מ': MilitaryRole.DUTY_OFFICER,
      'קצין תורן': MilitaryRole.DUTY_OFFICER,
      'מפקד': MilitaryRole.SQUAD_COMMANDER,
      'מפקד כיתה': MilitaryRole.SQUAD_COMMANDER,
      'לוחם': MilitaryRole.FIGHTER,
      'חייל': MilitaryRole.FIGHTER,
      // English values
      'PLATOON_COMMANDER': MilitaryRole.PLATOON_COMMANDER,
      'SERGEANT_MAJOR': MilitaryRole.SERGEANT_MAJOR,
      'OPERATIONS_SGT': MilitaryRole.OPERATIONS_SGT,
      'OPERATIONS_NCO': MilitaryRole.OPERATIONS_NCO,
      'DUTY_OFFICER': MilitaryRole.DUTY_OFFICER,
      'SQUAD_COMMANDER': MilitaryRole.SQUAD_COMMANDER,
      'FIGHTER': MilitaryRole.FIGHTER,
    };

    return mapping[hebrewRole] || null;
  }

  private mapMilitaryRoleToLegacyRole(militaryRole: MilitaryRole): UserRole {
    // Permission mapping:
    // ADMIN: Full access (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT)
    // OFFICER: Shifts, Users, Skills management (OPERATIONS_NCO)
    // COMMANDER: Forms/Requests, Messages management (DUTY_OFFICER)
    // SOLDIER: No admin access (SQUAD_COMMANDER, FIGHTER)
    const mapping: Record<MilitaryRole, UserRole> = {
      PLATOON_COMMANDER: UserRole.ADMIN,
      SERGEANT_MAJOR: UserRole.ADMIN,
      OPERATIONS_SGT: UserRole.ADMIN,
      OPERATIONS_NCO: UserRole.OFFICER,
      DUTY_OFFICER: UserRole.COMMANDER,
      SQUAD_COMMANDER: UserRole.SOLDIER,
      FIGHTER: UserRole.SOLDIER,
    };

    return mapping[militaryRole] || UserRole.SOLDIER;
  }

  getSampleCsv(): string {
    return `personalId,fullName,militaryRole,departmentCode,phone
1234567,ישראל ישראלי,לוחם,1,0501234567
2345678,יוסי כהן,מפקד,2,0502345678
3456789,דוד לוי,לוחם,1,`;
  }
}
