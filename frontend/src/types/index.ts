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
  createdAt: string;
}

export type UserRole = 'SOLDIER' | 'COMMANDER' | 'OFFICER' | 'MEDIC' | 'LOGISTICS' | 'ADMIN'| 'SFOGIST';

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

export type ShiftType = 'GUARD' | 'PATROL';

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
  MEDIC: 'חובש',
  LOGISTICS: 'לוגיסטיקה',
  ADMIN: 'מנהל מערכת',
  SFOGIST: 'ספוגיסט',
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
  GUARD: 'משמרת שמירה',
  PATROL: 'משמרת סיור',
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
