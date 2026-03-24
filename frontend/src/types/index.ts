// Military Role - organizational identity
export type MilitaryRole =
  | 'PLATOON_COMMANDER'
  | 'SERGEANT_MAJOR'
  | 'OPERATIONS_SGT'
  | 'OPERATIONS_NCO'
  | 'DUTY_OFFICER'
  | 'SQUAD_COMMANDER'
  | 'FIGHTER';

export const MILITARY_ROLE_LABELS: Record<MilitaryRole, string> = {
  PLATOON_COMMANDER: 'מפקד פלוגה',
  SERGEANT_MAJOR: 'סמ״פ',
  OPERATIONS_SGT: 'קמב״צ',
  OPERATIONS_NCO: 'סמב״צ',
  DUTY_OFFICER: 'מ״מ',
  SQUAD_COMMANDER: 'מפקד',
  FIGHTER: 'לוחם',
};

/**
 * Role Hierarchy: Maps MilitaryRole to recommended UserRole
 *
 * Admin-level (full access):
 *   - PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT → ADMIN
 *
 * Operations/Logistics (limited admin):
 *   - OPERATIONS_NCO → LOGISTICS
 *     Access: shifts, operational links, skills, zones, tasks
 *     NO access: messages, forms, soldiers management
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
 * Check if a military role has admin-level access
 */
export function isAdminMilitaryRole(militaryRole?: MilitaryRole): boolean {
  if (!militaryRole) return false;
  return ADMIN_MILITARY_ROLES.includes(militaryRole);
}

/**
 * Check if user is a Duty Officer (department-scoped access)
 */
export function isDutyOfficer(militaryRole?: MilitaryRole): boolean {
  return militaryRole === 'DUTY_OFFICER';
}

/**
 * Admin sections accessible by LOGISTICS role (OPERATIONS_NCO)
 */
export const LOGISTICS_ALLOWED_ADMIN_SECTIONS = [
  'service',   // Service cycles
  'shifts',    // Shift management
];

export const LOGISTICS_ALLOWED_ADMIN_CONTENT_ITEMS = [
  'operational', // Operational links
  'skills',      // Skills management
];

// Role hierarchy level for comparison (higher = more permissions)
export const ROLE_HIERARCHY_LEVEL: Record<UserRole, number> = {
  SYSTEM_TECHNICAL: 100,
  ADMIN: 100,
  LOGISTICS: 50,
  OFFICER: 50,
  COMMANDER: 20,
  SOLDIER: 10,
};

// Permission descriptions for each UserRole (SYSTEM_TECHNICAL hidden from UI)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SOLDIER: [
    'צפייה במשמרות שלו',
    'בקשת יציאות',
    'צפייה בהודעות',
    'עדכון פרופיל',
  ],
  COMMANDER: [
    'כל הרשאות חייל',
    'קבלת התראות פיקוד',
    'יצירת הודעות',
  ],
  OFFICER: [
    'כל הרשאות מפקד',
    'ניהול מחלקה',
    'אישור בקשות יציאה',
    'ניהול סבבי מילואים',
  ],
  LOGISTICS: [
    'כל הרשאות מפקד',
    'ניהול משמרות ושיבוצים',
    'ניהול אזורים ומשימות',
    'ניהול קישורים מבצעיים',
  ],
  ADMIN: [
    'גישה מלאה למערכת',
    'ניהול משתמשים',
    'הגדרות מערכת',
    'ייבוא נתונים',
  ],
  SYSTEM_TECHNICAL: [
    'גישה מלאה למערכת',
    'ניהול בסיס נתונים',
    'גישת מפתח',
  ],
};

// Helper to check if user can access a specific permission level
export function canAccessRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === 'ADMIN' || userRole === 'SYSTEM_TECHNICAL') return true;
  return ROLE_HIERARCHY_LEVEL[userRole] >= ROLE_HIERARCHY_LEVEL[requiredRole];
}

// Helper to get suggested UserRole based on MilitaryRole
export function getSuggestedUserRole(militaryRole: MilitaryRole): UserRole {
  return MILITARY_TO_USER_ROLE[militaryRole] || 'SOLDIER';
}

// Department interface
export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  personalId?: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole; // Legacy
  militaryRole?: MilitaryRole;
  department?: Department;
  departmentId?: string;
  armyNumber: string;
  idNumber?: string;
  dailyJob?: string;
  city?: string;
  fieldOfStudy?: string;
  birthDay?: string;
  isPreApproved?: boolean;
  isRegistered?: boolean;
  hasPasskey?: boolean; // Whether user has enrolled a passkey
  createdAt: string;
}

export type UserRole = 'SOLDIER' | 'COMMANDER' | 'OFFICER' | 'LOGISTICS' | 'ADMIN' | 'SYSTEM_TECHNICAL';

// User role labels - SYSTEM_TECHNICAL intentionally excluded to hide from UI
export const USER_ROLE_LABELS: Record<Exclude<UserRole, 'SYSTEM_TECHNICAL'>, string> = {
  SOLDIER: 'חייל',
  COMMANDER: 'מפקד',
  OFFICER: 'קצין',
  LOGISTICS: 'לוגיסטיקה',
  ADMIN: 'מנהל',
};

// Visible roles for UI dropdowns (excludes SYSTEM_TECHNICAL)
export const VISIBLE_USER_ROLES: Exclude<UserRole, 'SYSTEM_TECHNICAL'>[] = [
  'SOLDIER', 'COMMANDER', 'OFFICER', 'LOGISTICS', 'ADMIN'
];

export type MessageTargetAudience = 'ALL' | 'COMMANDERS_PLUS' | 'OFFICERS_PLUS' | 'ADMIN_ONLY';

export const MESSAGE_TARGET_LABELS: Record<MessageTargetAudience, string> = {
  ALL: 'כולם',
  COMMANDERS_PLUS: 'מפקדים ומעלה',
  OFFICERS_PLUS: 'קצינים ומעלה',
  ADMIN_ONLY: 'מנהלים בלבד',
};

export interface LoginResponse {
  success: boolean;
  message: string;
  email?: string;
  token?: string;
  user?: User;
}

export interface Message {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  priority: MessagePriority;
  targetAudience: MessageTargetAudience;
  requiresConfirmation: boolean;
  isActive: boolean;
  createdAt: string;
}

export type MessageType = 'GENERAL' | 'FOOD' | 'URGENT' | 'ANNOUNCEMENT' | 'OPERATIONAL';
export type MessagePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ShiftPost {
  id: string;
  date: string;
  shiftType: ShiftType;
  message?: string;
  imageUrl?: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  createdAt: string;
}

export type ShiftType = 'GUARD' | 'PATROL' | 'KITCHEN' | 'CLEANING' | 'SPECIAL';

export type LeaveType = 'SHORT' | 'HOME';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';

export interface LeaveCategory {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  soldier: {
    id: string;
    fullName: string;
    phone: string;
    armyNumber: string;
  };
  type: LeaveType;
  category?: LeaveCategory;
  reason?: string;
  exitTime: string;
  expectedReturn: string;
  actualReturn?: string;
  status: LeaveStatus;
  approvedBy?: {
    id: string;
    fullName: string;
  };
  adminNote?: string;
  createdAt: string;
  isOverdue?: boolean;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  displayName: string;
  count: number;
  type: string;
}

export interface LeaveRequestDashboard {
  stats: {
    totalSoldiers: number;
    inBase: number;
    outOfBase: number;
    overdue: number;
    pending: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  activeLeaves: LeaveRequest[];
  pendingRequests: LeaveRequest[];
  currentCycle?: {
    id: string;
    name: string;
    startDate: string;
  } | null;
}

export interface FormSubmission {
  id: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  type: FormType;
  content: Record<string, any>;
  status: FormStatus;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

export type FormType =
  | 'SHORT_LEAVE'
  | 'EQUIPMENT_SHORTAGE'
  | 'HOME_LEAVE'
  | 'IMPROVEMENT_SUGGESTION'
  | 'RESTAURANT_RECOMMENDATION';

export type FormStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SocialPost {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
  };
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
  };
  content: string;
  category: RecommendationCategory;
  createdAt: string;
}

export type RecommendationCategory = 'RESTAURANT' | 'ACTIVITY' | 'SERVICE' | 'OTHER';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface SoldierStatus {
  id: string;
  soldierId: string;
  status: SoldierStatusType;
  note?: string;
  updatedAt: string;
  soldier?: {
    id: string;
    fullName: string;
    phone: string;
    armyNumber: string;
  };
}

export type SoldierStatusType = 'ACTIVE' | 'LEAVE' | 'SICK' | 'TRAINING' | 'OTHER';

export interface OperationalLink {
  id: string;
  title: string;
  description?: string;
  url: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
}

export interface Contact {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  email: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SOLDIER: 'לוחם',
  COMMANDER: 'מפקד',
  OFFICER: 'קצין',
  LOGISTICS: 'לוגיסטיקה',
  ADMIN: 'מנהל מערכת',
  SYSTEM_TECHNICAL: 'מערכת טכני',
};

// Skills, Zones, Tasks Types
export interface Skill {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  _count?: {
    soldiers: number;
    taskRequirements: number;
  };
}

export interface SoldierSkill {
  id: string;
  soldierId: string;
  skillId: string;
  skill: Skill;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  tasks?: Task[];
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  zoneId: string;
  zone?: Zone;
  name: string;
  description?: string;
  requiredPeopleCount: number;
  isActive: boolean;
  requirements?: TaskRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskRequirement {
  id: string;
  taskId: string;
  skillId: string;
  skill: Skill;
  quantity: number;
}

export interface SoldierWithSkills extends User {
  skills: SoldierSkill[];
}

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  SHORT_LEAVE: 'בקשת יציאה קצרה',
  EQUIPMENT_SHORTAGE: 'דיווח חוסר בציוד',
  HOME_LEAVE: 'בקשת יציאה הביתה',
  IMPROVEMENT_SUGGESTION: 'הצעות לשיפור',
  RESTAURANT_RECOMMENDATION: 'המלצת מסעדה',
};

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  PENDING: 'ממתין',
  APPROVED: 'מאושר',
  REJECTED: 'נדחה',
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  GUARD: 'שמירה',
  PATROL: 'סיור',
  KITCHEN: 'מטבח',
  CLEANING: 'ניקיון',
  SPECIAL: 'מיוחד',
};

export const STATUS_LABELS: Record<SoldierStatusType, string> = {
  ACTIVE: 'פעיל',
  LEAVE: 'חופשה',
  SICK: 'חולה',
  TRAINING: 'הכשרה',
  OTHER: 'אחר',
};

export const PRIORITY_LABELS: Record<MessagePriority, string> = {
  LOW: 'נמוך',
  MEDIUM: 'בינוני',
  HIGH: 'גבוה',
  CRITICAL: 'קריטי',
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  GENERAL: 'כללי',
  FOOD: 'מזון',
  URGENT: 'דחוף',
  ANNOUNCEMENT: 'הודעה',
  OPERATIONAL: 'מבצעי',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  SHORT: 'יציאה קצרה',
  HOME: 'יציאה הביתה',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'ממתין לאישור',
  APPROVED: 'מאושר',
  REJECTED: 'נדחה',
  ACTIVE: 'בחוץ',
  RETURNED: 'חזר',
  OVERDUE: 'באיחור',
};

// Phase 2: Shift Templates and Assignments

export interface ShiftTemplate {
  id: string;
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShiftAssignmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface ShiftAssignment {
  id: string;
  date: string;
  shiftTemplateId: string;
  shiftTemplate: ShiftTemplate;
  taskId: string;
  task: Task & { zone: Zone };
  soldierId: string;
  soldier: {
    id: string;
    fullName: string;
    armyNumber: string;
    phone: string;
    role: UserRole;
    skills: SoldierSkill[];
  };
  status: ShiftAssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSoldier extends User {
  skills: SoldierSkill[];
  shiftAssignments: ShiftAssignment[];
  soldierStatus?: SoldierStatus;
}

export interface TaskFulfillment {
  taskId: string;
  taskName: string;
  totalAssigned: number;
  requirements: {
    skillId: string;
    skillName: string;
    required: number;
    assigned: number;
    fulfilled: boolean;
  }[];
  allFulfilled: boolean;
}

export const SHIFT_ASSIGNMENT_STATUS_LABELS: Record<ShiftAssignmentStatus, string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'אושר',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
};

// Shift Schedule (draft/publish workflow)
export type ShiftScheduleStatus = 'DRAFT' | 'PUBLISHED';

export interface ShiftSchedule {
  id: string;
  date: string;
  zoneId?: string;
  zone?: Zone;
  status: ShiftScheduleStatus;
  publishedAt?: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
  assignments?: ShiftAssignment[];
  _count?: {
    assignments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleStatus {
  exists: boolean;
  status: ShiftScheduleStatus;
  assignmentCount: number;
  publishedAt?: string;
  publishedBy?: {
    id: string;
    fullName: string;
  };
}

export interface PublishResult {
  schedule: ShiftSchedule;
  assignmentsCount: number;
  notifiedSoldiers: number;
}

export const SHIFT_SCHEDULE_STATUS_LABELS: Record<ShiftScheduleStatus, string> = {
  DRAFT: 'טיוטה',
  PUBLISHED: 'פורסם',
};

// ============================================================
// RESERVE SERVICE CYCLE - סבב מילואים
// ============================================================

export type ReserveServiceCycleStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ServiceAttendanceStatus = 'PENDING' | 'ARRIVED' | 'NOT_COMING' | 'LATE' | 'LEFT_EARLY';
export type ServiceChecklistCategory = 'STAFF' | 'VEHICLES' | 'LOGISTICS' | 'HOTEL' | 'WEAPONS' | 'GENERAL';

export interface ReserveServiceCycle {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  status: ReserveServiceCycleStatus;
  createdById: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    attendances: number;
    adminChecklists: number;
  };
}

export interface ServiceAttendance {
  id: string;
  serviceCycleId: string;
  serviceCycle?: ReserveServiceCycle;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    personalId?: string;
    phone?: string;
    militaryRole?: MilitaryRole;
    department?: Department;
  };
  attendanceStatus: ServiceAttendanceStatus;
  cannotAttendReason?: string;
  checkInAt?: string;
  checkOutAt?: string;
  onboardGunNumber?: string;
  hotelRoomNumber?: string;
  notes?: string;
  totalActiveDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAdminChecklist {
  id: string;
  serviceCycleId: string;
  category: ServiceChecklistCategory;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedById?: string;
  completedBy?: {
    id: string;
    fullName: string;
  };
  completedAt?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCycleSummary {
  cycle: ReserveServiceCycle;
  stats: {
    totalSoldiers: number;
    totalResponded: number;
    pending: number;
    arrived: number;
    notComing: number;
    late: number;
    leftEarly: number;
    withGunAssigned: number;
    withRoomAssigned: number;
  };
  reasonsGrouped: Record<string, number>;
  checklistStats: {
    total: number;
    completed: number;
  };
}

export const SERVICE_CYCLE_STATUS_LABELS: Record<ReserveServiceCycleStatus, string> = {
  PLANNED: 'מתוכנן',
  ACTIVE: 'פעיל',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
};

export const SERVICE_ATTENDANCE_STATUS_LABELS: Record<ServiceAttendanceStatus, string> = {
  PENDING: 'ממתין לעדכון',
  ARRIVED: 'הגיע',
  NOT_COMING: 'לא מגיע',
  LATE: 'איחור',
  LEFT_EARLY: 'יצא מוקדם',
};

export const SERVICE_CHECKLIST_CATEGORY_LABELS: Record<ServiceChecklistCategory, string> = {
  STAFF: 'סגל',
  VEHICLES: 'רכבים',
  LOGISTICS: 'לוגיסטיקה',
  HOTEL: 'מלון',
  WEAPONS: 'נשקים',
  GENERAL: 'כללי',
};

// ============================================================
// Social Activities - פעילויות חברתיות
// ============================================================

export type SocialActivityStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'JOINED' | 'CONFIRMED' | 'CANCELLED';

export const SOCIAL_ACTIVITY_STATUS_LABELS: Record<SocialActivityStatus, string> = {
  OPEN: 'פתוח להצטרפות',
  FULL: 'מלא',
  IN_PROGRESS: 'בתהליך',
  COMPLETED: 'הסתיים',
  CANCELLED: 'בוטל',
};

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  JOINED: 'הצטרף',
  CONFIRMED: 'אישר הגעה',
  CANCELLED: 'ביטל',
};

export interface SocialActivityParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    phone?: string;
  };
  status: ParticipantStatus;
  joinedAt: string;
  confirmedAt: string | null;
}

export interface SocialActivity {
  id: string;
  title: string;
  description: string | null;
  place: string;
  startTime: string;
  endTime: string | null;
  maxParticipants: number | null;
  status: SocialActivityStatus;
  createdById: string;
  createdBy: {
    id: string;
    fullName: string;
    phone?: string;
  };
  participants: SocialActivityParticipant[];
  _count: {
    participants: number;
  };
  createdAt: string;
  updatedAt: string;
}
