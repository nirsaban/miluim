import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Map of Prisma model names to their table names
const MODEL_TABLE_MAP: Record<string, string> = {
  battalion: 'battalions',
  company: 'companies',
  department: 'departments',
  permission: 'permissions',
  rolePermission: 'role_permissions',
  user: 'users',
  otp: 'otps',
  webAuthnCredential: 'webauthn_credentials',
  webAuthnChallenge: 'webauthn_challenges',
  message: 'messages',
  messageConfirmation: 'message_confirmations',
  shiftPost: 'shift_posts',
  formSubmission: 'form_submissions',
  socialPost: 'social_posts',
  recommendation: 'recommendations',
  notification: 'notifications',
  pushSubscription: 'push_subscriptions',
  soldierStatus: 'soldier_statuses',
  role: 'roles',
  operationalLink: 'operational_links',
  leaveCategory: 'leave_categories',
  leaveRequest: 'leave_requests',
  skill: 'skills',
  soldierSkill: 'soldier_skills',
  zone: 'zones',
  task: 'tasks',
  taskRequirement: 'task_requirements',
  shiftTemplate: 'shift_templates',
  shiftSchedule: 'shift_schedules',
  shiftAssignment: 'shift_assignments',
  reserveServiceCycle: 'reserve_service_cycles',
  serviceAttendance: 'service_attendances',
  serviceAdminChecklist: 'service_admin_checklists',
  serviceVehicle: 'service_vehicles',
  socialActivity: 'social_activities',
  socialActivityParticipant: 'social_activity_participants',
  emergencyEvent: 'emergency_events',
  emergencyAcknowledgement: 'emergency_acknowledgements',
  taskChecklistItem: 'task_checklist_items',
  shiftChecklistSubmission: 'shift_checklist_submissions',
  shiftChecklistSubmissionItem: 'shift_checklist_submission_items',
  shiftReport: 'shift_reports',
};

// Reverse map for table name to model name lookup
const TABLE_MODEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MODEL_TABLE_MAP).map(([k, v]) => [v, k])
);

export interface TableInfo {
  name: string;
  modelName: string;
  displayName: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isRelation: boolean;
  defaultValue?: string;
}

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get list of all tables
   */
  async getTables(): Promise<TableInfo[]> {
    const tables: TableInfo[] = Object.entries(MODEL_TABLE_MAP).map(([modelName, tableName]) => ({
      name: tableName,
      modelName,
      displayName: this.formatDisplayName(modelName),
    }));

    return tables.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get schema (columns) for a specific table
   */
  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    // Query PostgreSQL information_schema for column info
    const columns = await this.prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>>`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    // Get primary key columns
    const pkColumns = await this.prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ${tableName}::regclass
      AND i.indisprimary
    `;

    const pkSet = new Set(pkColumns.map(pk => pk.column_name));

    return columns.map(col => ({
      name: col.column_name,
      type: col.data_type,
      isNullable: col.is_nullable === 'YES',
      isPrimaryKey: pkSet.has(col.column_name),
      isRelation: col.column_name.endsWith('Id') && col.column_name !== 'id',
      defaultValue: col.column_default || undefined,
    }));
  }

  /**
   * Get all data from a table with pagination
   */
  async getTableData(
    tableName: string,
    page: number = 1,
    limit: number = 50,
    orderBy?: string,
    orderDir: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model '${modelName}' not accessible`);
    }

    const skip = (page - 1) * limit;

    // Get total count
    const total = await model.count();

    // Build orderBy
    const order: any = {};
    if (orderBy) {
      order[orderBy] = orderDir;
    } else {
      // Default to createdAt desc, or id if no createdAt
      order.createdAt = 'desc';
    }

    // Get data
    let data: any[];
    try {
      data = await model.findMany({
        skip,
        take: limit,
        orderBy: order,
      });
    } catch (e) {
      // If orderBy fails (e.g., no createdAt), try without it
      data = await model.findMany({
        skip,
        take: limit,
      });
    }

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single record by ID
   */
  async getRecord(tableName: string, id: string): Promise<any> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model '${modelName}' not accessible`);
    }

    const record = await model.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Record with id '${id}' not found in '${tableName}'`);
    }

    return record;
  }

  /**
   * Create a new record
   */
  async createRecord(tableName: string, data: Record<string, any>): Promise<any> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model '${modelName}' not accessible`);
    }

    // Remove id if present (let Prisma generate it)
    const { id, ...createData } = data;

    try {
      return await model.create({ data: createData });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(`Failed to create record: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update a record
   */
  async updateRecord(tableName: string, id: string, data: Record<string, any>): Promise<any> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model '${modelName}' not accessible`);
    }

    // Remove id from update data
    const { id: _, ...updateData } = data;

    try {
      return await model.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Record with id '${id}' not found`);
        }
        throw new BadRequestException(`Failed to update record: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableName: string, id: string): Promise<{ success: boolean }> {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
      throw new BadRequestException(`Table '${tableName}' not found`);
    }

    const model = (this.prisma as any)[modelName];
    if (!model) {
      throw new BadRequestException(`Model '${modelName}' not accessible`);
    }

    try {
      await model.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Record with id '${id}' not found`);
        }
        throw new BadRequestException(`Failed to delete record: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Format model name to display name
   */
  private formatDisplayName(modelName: string): string {
    // Convert camelCase to Title Case with spaces
    return modelName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
