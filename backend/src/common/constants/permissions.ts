import { MilitaryRole, UserRole } from '@prisma/client';

/**
 * Role Hierarchy: Maps MilitaryRole to recommended UserRole
 * This defines the default authorization level for each military role
 *
 * Admin-level (full access):
 *   - PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT → ADMIN
 *
 * Operations/Logistics (limited admin):
 *   - OPERATIONS_NCO → LOGISTICS
 *     Access: shifts, operational links, skills, zones, tasks
 *     NO access: messages, forms, soldiers, csv-import
 *
 * Department-scoped (OFFICER with department filter):
 *   - DUTY_OFFICER → OFFICER (department-scoped)
 *     Access: dashboard/department, dashboard/shift-duty
 *     Can approve: only their department's leave requests/forms
 *
 * Commander / Basic:
 *   - SQUAD_COMMANDER → COMMANDER
 *   - FIGHTER → SOLDIER
 */
export const MILITARY_TO_USER_ROLE: Record<MilitaryRole, UserRole> = {
  PLATOON_COMMANDER: 'ADMIN',        // מפקד פלוגה - Full system access
  SERGEANT_MAJOR: 'ADMIN',           // סמ״פ - Full system access (admin-level)
  OPERATIONS_SGT: 'ADMIN',           // קמב״צ - Full system access (admin-level)
  OPERATIONS_NCO: 'LOGISTICS',       // סמב״צ - Shift & operational management only
  DUTY_OFFICER: 'OFFICER',           // מ״מ - Department-scoped access
  SQUAD_COMMANDER: 'COMMANDER',      // מפקד - Command-level notifications
  FIGHTER: 'SOLDIER',                // לוחם - Basic access
};

/**
 * Military roles that have admin-level access
 */
export const ADMIN_MILITARY_ROLES: MilitaryRole[] = [
  'PLATOON_COMMANDER',
  'SERGEANT_MAJOR',
  'OPERATIONS_SGT',
];

/**
 * Admin routes accessible by LOGISTICS role (OPERATIONS_NCO)
 * These users have limited admin access
 */
export const LOGISTICS_ALLOWED_ADMIN_SECTIONS = [
  'service',   // Service cycles
  'shifts',    // Shift management
];

export const LOGISTICS_ALLOWED_ADMIN_CONTENT_ITEMS = [
  'operational', // Operational links
  'skills',      // Skills management
];

/**
 * Check if a military role has admin-level access
 */
export function isAdminMilitaryRole(militaryRole: MilitaryRole): boolean {
  return ADMIN_MILITARY_ROLES.includes(militaryRole);
}

/**
 * Check if user is a Duty Officer (department-scoped access)
 */
export function isDutyOfficer(militaryRole: MilitaryRole): boolean {
  return militaryRole === 'DUTY_OFFICER';
}

/**
 * Role hierarchy level for comparison (higher = more permissions)
 */
export const ROLE_HIERARCHY_LEVEL: Record<UserRole, number> = {
  SYSTEM_TECHNICAL: 100,
  ADMIN: 100,
  LOGISTICS: 50,
  OFFICER: 50,
  COMMANDER: 20,
  SOLDIER: 10,
};

/**
 * Check if a user role meets the minimum required role
 */
export function isAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === 'ADMIN' || userRole === 'SYSTEM_TECHNICAL') return true;
  return ROLE_HIERARCHY_LEVEL[userRole] >= ROLE_HIERARCHY_LEVEL[requiredRole];
}

/**
 * Get the suggested UserRole based on MilitaryRole
 */
export function getSuggestedUserRole(militaryRole: MilitaryRole): UserRole {
  return MILITARY_TO_USER_ROLE[militaryRole] || 'SOLDIER';
}

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

  // סמב״צ - Operations NCO - Operational & logistics control (same as LOGISTICS role)
  [MilitaryRole.OPERATIONS_NCO]: [
    Permission.VIEW_SHIFT_MANAGEMENT,
    Permission.MANAGE_ZONES,
    Permission.MANAGE_TASKS,
    Permission.MANAGE_SKILLS,
    Permission.MANAGE_SHIFT_BOARD,
    Permission.MANAGE_SHIFT_IMAGES,
    Permission.VIEW_ALL_LEAVES,        // Can view leaves for operational planning
    Permission.MANAGE_MESSAGES,        // Can send operational messages
  ],

  // מ״מ - Duty Officer - Department-scoped access + leave approval (same as OFFICER role)
  [MilitaryRole.DUTY_OFFICER]: [
    Permission.VIEW_DEPARTMENT_REQUESTS,
    Permission.UPDATE_DEPARTMENT_REQUESTS,
    Permission.MANAGE_MESSAGES,
    Permission.MANAGE_SYSTEM_MESSAGES,
    Permission.VIEW_ALL_LEAVES,          // Can view all leaves
    Permission.APPROVE_LEAVES,           // Can approve leave requests
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
