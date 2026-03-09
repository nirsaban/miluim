import { MilitaryRole } from '@prisma/client';

// Permission keys
export enum Permission {
  // User Management
  MANAGE_PREAPPROVED_USERS = 'MANAGE_PREAPPROVED_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  IMPORT_USERS_CSV = 'IMPORT_USERS_CSV',

  // Skills & Departments
  MANAGE_SKILLS = 'MANAGE_SKILLS',
  MANAGE_DEPARTMENTS = 'MANAGE_DEPARTMENTS',

  // Requests/Forms
  VIEW_ALL_REQUESTS = 'VIEW_ALL_REQUESTS',
  VIEW_DEPARTMENT_REQUESTS = 'VIEW_DEPARTMENT_REQUESTS',
  UPDATE_ALL_REQUESTS = 'UPDATE_ALL_REQUESTS',
  UPDATE_DEPARTMENT_REQUESTS = 'UPDATE_DEPARTMENT_REQUESTS',

  // Messages
  MANAGE_MESSAGES = 'MANAGE_MESSAGES',
  MANAGE_SYSTEM_MESSAGES = 'MANAGE_SYSTEM_MESSAGES',

  // Shifts
  MANAGE_SHIFT_IMAGES = 'MANAGE_SHIFT_IMAGES',
  MANAGE_ZONES = 'MANAGE_ZONES',
  MANAGE_TASKS = 'MANAGE_TASKS',
  MANAGE_SHIFT_BOARD = 'MANAGE_SHIFT_BOARD',
  VIEW_SHIFT_MANAGEMENT = 'VIEW_SHIFT_MANAGEMENT',

  // Leave Requests
  VIEW_ALL_LEAVES = 'VIEW_ALL_LEAVES',
  APPROVE_LEAVES = 'APPROVE_LEAVES',
}

// Role-Permission Mapping
export const ROLE_PERMISSIONS: Record<MilitaryRole, Permission[]> = {
  // מפקד פלוגה - Full access
  [MilitaryRole.PLATOON_COMMANDER]: [
    Permission.MANAGE_PREAPPROVED_USERS,
    Permission.MANAGE_USERS,
    Permission.IMPORT_USERS_CSV,
    Permission.MANAGE_SKILLS,
    Permission.MANAGE_DEPARTMENTS,
    Permission.VIEW_ALL_REQUESTS,
    Permission.UPDATE_ALL_REQUESTS,
    Permission.MANAGE_MESSAGES,
    Permission.MANAGE_SYSTEM_MESSAGES,
    Permission.MANAGE_SHIFT_IMAGES,
    Permission.MANAGE_ZONES,
    Permission.MANAGE_TASKS,
    Permission.MANAGE_SHIFT_BOARD,
    Permission.VIEW_SHIFT_MANAGEMENT,
    Permission.VIEW_ALL_LEAVES,
    Permission.APPROVE_LEAVES,
  ],

  // סמ״פ - Same as Platoon Commander
  [MilitaryRole.SERGEANT_MAJOR]: [
    Permission.MANAGE_PREAPPROVED_USERS,
    Permission.MANAGE_USERS,
    Permission.IMPORT_USERS_CSV,
    Permission.MANAGE_SKILLS,
    Permission.MANAGE_DEPARTMENTS,
    Permission.VIEW_ALL_REQUESTS,
    Permission.UPDATE_ALL_REQUESTS,
    Permission.MANAGE_MESSAGES,
    Permission.MANAGE_SYSTEM_MESSAGES,
    Permission.MANAGE_SHIFT_IMAGES,
    Permission.MANAGE_ZONES,
    Permission.MANAGE_TASKS,
    Permission.MANAGE_SHIFT_BOARD,
    Permission.VIEW_SHIFT_MANAGEMENT,
    Permission.VIEW_ALL_LEAVES,
    Permission.APPROVE_LEAVES,
  ],

  // קמב״צ - Same as Platoon Commander
  [MilitaryRole.OPERATIONS_SGT]: [
    Permission.MANAGE_PREAPPROVED_USERS,
    Permission.MANAGE_USERS,
    Permission.IMPORT_USERS_CSV,
    Permission.MANAGE_SKILLS,
    Permission.MANAGE_DEPARTMENTS,
    Permission.VIEW_ALL_REQUESTS,
    Permission.UPDATE_ALL_REQUESTS,
    Permission.MANAGE_MESSAGES,
    Permission.MANAGE_SYSTEM_MESSAGES,
    Permission.MANAGE_SHIFT_IMAGES,
    Permission.MANAGE_ZONES,
    Permission.MANAGE_TASKS,
    Permission.MANAGE_SHIFT_BOARD,
    Permission.VIEW_SHIFT_MANAGEMENT,
    Permission.VIEW_ALL_LEAVES,
    Permission.APPROVE_LEAVES,
  ],

  // סמב״צ - Operations NCO - Limited operational control
  [MilitaryRole.OPERATIONS_NCO]: [
    Permission.VIEW_SHIFT_MANAGEMENT,
    Permission.MANAGE_ZONES,
    Permission.MANAGE_TASKS,
    Permission.MANAGE_SKILLS,
    Permission.MANAGE_SHIFT_BOARD,
  ],

  // מ״מ - Duty Officer - Department-scoped access
  [MilitaryRole.DUTY_OFFICER]: [
    Permission.VIEW_DEPARTMENT_REQUESTS,
    Permission.UPDATE_DEPARTMENT_REQUESTS,
    Permission.MANAGE_MESSAGES,
    Permission.MANAGE_SYSTEM_MESSAGES,
  ],

  // מפקד - Squad Commander - Basic soldier portal
  [MilitaryRole.SQUAD_COMMANDER]: [],

  // לוחם - Fighter - Basic soldier portal
  [MilitaryRole.FIGHTER]: [],
};

// Helper function to check if role has permission
export function hasPermission(
  militaryRole: MilitaryRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[militaryRole]?.includes(permission) || false;
}

// Helper function to get all permissions for a role
export function getRolePermissions(militaryRole: MilitaryRole): Permission[] {
  return ROLE_PERMISSIONS[militaryRole] || [];
}
