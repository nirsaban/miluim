/**
 * Centralized Query Keys for React Query
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy to invalidate related queries together
 * - Consistent naming across the app
 */

export const queryKeys = {
  // User & Auth
  user: ['user'] as const,
  userHome: ['user-home'] as const,
  userProfile: ['user-profile'] as const,

  // Messages
  messages: ['messages'] as const,
  adminMessages: ['admin-messages'] as const,
  messageAnalytics: (id: string) => ['message-analytics', id] as const,

  // Notifications
  notifications: ['notifications'] as const,
  adminNotifications: ['admin-notifications'] as const,

  // Shifts
  shifts: ['shifts'] as const,
  adminShifts: ['admin-shifts'] as const,
  shiftSchedule: (date: string) => ['shift-schedule', date] as const,
  shiftTemplates: ['shift-templates'] as const,
  shiftAssignments: ['shift-assignments'] as const,
  myShifts: ['my-shifts'] as const,

  // Soldiers / Users
  soldiers: ['soldiers'] as const,
  adminSoldiers: ['admin-soldiers'] as const,
  preapprovedUsers: ['preapproved-users'] as const,

  // Leave / Requests
  leaveRequests: ['leave-requests'] as const,
  adminLeaveRequests: ['admin-leave-requests'] as const,
  leaveCategories: ['leave-categories'] as const,

  // Service Cycles
  serviceCycles: ['service-cycles'] as const,
  currentService: ['current-service'] as const,
  serviceAttendance: ['service-attendance'] as const,
  serviceChecklist: ['service-checklist'] as const,

  // Skills / Zones / Tasks
  skills: ['skills'] as const,
  zones: ['zones'] as const,
  tasks: ['tasks'] as const,

  // Forms
  forms: ['forms'] as const,
  adminForms: ['admin-forms'] as const,

  // Gallery / Social
  gallery: ['gallery'] as const,
  socialPosts: ['social-posts'] as const,

  // Recommendations
  recommendations: ['recommendations'] as const,

  // Operational
  operationalLinks: ['operational-links'] as const,

  // Status
  soldierStatus: ['soldier-status'] as const,

  // Workloads
  workloads: ['workloads'] as const,
  adminWorkloads: ['admin-workloads'] as const,

  // Battalion
  battalions: ['battalions'] as const,
  companies: ['companies'] as const,
  battalionOverview: ['battalion-overview'] as const,
  battalionAttendance: ['battalion-attendance'] as const,
  battalionManpower: ['battalion-manpower'] as const,
  battalionLeaves: ['battalion-leaves'] as const,
  battalionActiveServices: ['battalion-active-services'] as const,
};

/**
 * Helper to invalidate multiple related queries at once
 * Usage: invalidateRelatedQueries(queryClient, ['messages', 'adminMessages', 'userHome'])
 */
export function getRelatedQueryKeys(keys: (keyof typeof queryKeys)[]): readonly (readonly string[])[] {
  return keys.map(key => {
    const value = queryKeys[key];
    return typeof value === 'function' ? [] : value;
  }).filter(k => k.length > 0);
}

/**
 * Common invalidation groups - use when data changes affect multiple views
 */
export const invalidationGroups = {
  // When messages change, invalidate home view too
  messages: [queryKeys.messages, queryKeys.adminMessages, queryKeys.userHome],

  // When notifications change
  notifications: [queryKeys.notifications, queryKeys.adminNotifications, queryKeys.userHome],

  // When shifts change
  shifts: [queryKeys.shifts, queryKeys.adminShifts, queryKeys.myShifts, queryKeys.shiftAssignments],

  // When soldiers/users change
  soldiers: [queryKeys.soldiers, queryKeys.adminSoldiers, queryKeys.userHome],

  // When leave requests change
  leave: [queryKeys.leaveRequests, queryKeys.adminLeaveRequests, queryKeys.userHome],

  // When service data changes
  service: [queryKeys.serviceCycles, queryKeys.currentService, queryKeys.serviceAttendance, queryKeys.serviceChecklist],
};
