# מערכת יוגב – Project Context

This file contains persistent context for the Yogev operational system.

Claude should always read this file before generating new code or modifications.

Purpose:
Reduce token usage by storing project knowledge.

---

# Project Overview

System name:
מערכת יוגב – מערכת תפעול פלוגתית

Purpose:
Internal operational system for a reserve platoon.

Main capabilities:

• Soldier management
• Operational zones
• Task assignments
• Shift cycles
• Forms and requests
• Notifications
• Message board
• Food operations information
• Soldier social posts
• Admin operational dashboard

---

# Tech Stack

Frontend:
Next.js
TypeScript
TailwindCSS
RTL layout

Backend:
NestJS
TypeScript
Prisma ORM
PostgreSQL

Infrastructure:

Docker
Nginx
Hostinger VPS

Authentication:

Email + Password
Email OTP verification via Gmail API

---

# UI Language

All UI must be Hebrew.

RTL layout required.

Examples:

Login → התחברות
Register → הרשמה
Dashboard → לוח בקרה
Notifications → התראות
Forms → טפסים

---

# Core Modules

## Soldiers

Represents all platoon members.

Fields:

שם מלא
טלפון
אימייל
מספר אישי
תעודת זהות
תפקיד ראשי
Skills

---

## Skills

Soldiers can have multiple skills.

Examples:

מפקד
נהג
לוחם
ספוגיסט
חובש

Primary role must also exist as skill.

---

## Zones

Operational areas.

Examples:

טיילת
מעבר גבול
מלון דן

Zones contain tasks.

---

## Tasks

Each zone contains operational tasks.

Example:

Task: סיור

Requirements:

מפקד (1)
נהג (1)
לוחם (2)

---

## Shift Cycles

System supports 24 hour operational cycles.

Examples:

06:00 – 18:00
18:00 – 06:00

or

3 shift cycles.

Each shift must fill all tasks.

---

## Scheduling

Admin assigns soldiers to task slots.

Assignment rules:

• Soldier cannot work two shifts same day
• Soldier cannot work night followed by morning
• Soldier cannot work more than 3 consecutive nights
• Soldier must have required skill

---

## Forms

System includes operational forms:

בקשת יציאה קצרה
דיווח חוסר בציוד
בקשת יציאה הביתה
הצעות לשיפור
המלצת מסעדה

---

## Notifications

Notifications shown on dashboard.

Examples:

פורסם סידור משמרות חדש
בקשה אושרה
בקשה נדחתה

---

# Deployment

System runs on VPS.

Architecture:

Nginx
Frontend container
Backend container
PostgreSQL container

---

# UI Structure

Main pages:

/login
/register
/dashboard

Admin:

/admin/soldiers
/admin/zones
/admin/tasks
/admin/schedule

---

# Drag & Drop Scheduling

Admin UI includes drag and drop soldier assignment.

Soldiers list shows:

name
skills
last shift
night count

Shift board shows:

tasks
required roles
assignment slots

---

# Future Features

AI scheduler
Workload balancing
WhatsApp notifications

---

# Recent Updates (March 2026)

## OFFICER Role Management

Officers now manage their department through `/dashboard/department` instead of admin panel.

Department Dashboard Tabs:
- Overview (סקירה כללית) - Stats, attendance, active cycle
- Requests (בקשות) - Leave request approval/rejection
- Soldiers (חיילים) - Department member list
- Messages (הודעות) - Department-scoped messaging

Navigation Changes:
- Header shows "המחלקה שלי" for OFFICER role
- Mobile bottom nav shows "מחלקה" instead of "בקשות וטפסים"
- Officers removed from admin panel access

## Push Notifications

Implemented push notifications for leave requests:
- Soldier submits request → Officers in department receive push
- ADMIN users also receive notification
- Uses `PushService` with Web Push API

## Department-Scoped Messages

Officers can send messages only to their department:
- `departmentId` field on Message model
- `POST /messages/department` endpoint
- Home page shows department messages

## Access Control Enhancements

Leave request verification:
- `verifyAccessToRequest()` method in LeaveRequestsService
- ADMIN sees all, OFFICER only same department
- Applied to approve/reject/return endpoints

Military Role Permissions:
- DUTY_OFFICER → gets OFFICER permissions
- PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT → get ADMIN permissions

## New API Endpoints

Department (OFFICER):
- `GET /users/department/comprehensive-stats`
- `GET /users/department/leave-requests`
- `GET /users/department/messages`

Messages:
- `POST /messages/department`
- `GET /messages/my-department`

Leave Requests:
- `PATCH /leave-requests/my/:id/return` (self-confirm return)

## UI Components

New/Updated Components:
- `PWAInstallPrompt` - First-time mobile install instructions
- `MessageCarousel` - Rotating announcements
- `GallerySection` - Improved image carousel
- Department page with tabbed interface

## Shift Management

Shift Officer Dashboard enhancements:
- Battery level reporting
- Missing items tracking
- Real-time soldier status
- Quick attendance actions

---

# Instructions for Claude

When generating code:

1. Respect existing architecture
2. Extend modules rather than replacing them
3. Maintain Hebrew RTL UI
4. Follow NestJS modular structure
5. Keep backend services separated
6. Avoid breaking current functionality
7. Respect role-based access control patterns
8. Use department scoping for OFFICER features
9. Send push notifications for important events

---

# Key Implementation Patterns

## Role-Based Navigation

```typescript
// UserLayout.tsx - getMobileNavItems()
function getMobileNavItems(userRole: UserRole): NavItem[] {
  if (userRole === 'OFFICER') {
    return [...]; // Shows מחלקה
  }
  return [...]; // Shows בקשות וטפסים
}
```

## Department Access Verification

```typescript
// leave-requests.service.ts
private async verifyAccessToRequest(
  requestId: string,
  userId: string,
  userRole: UserRole,
  militaryRole?: MilitaryRole,
): Promise<{ request: any; hasAccess: boolean }> {
  // ADMIN sees all
  // OFFICER only same department as soldier
}
```

## Push Notification Pattern

```typescript
// leave-requests.service.ts
private async notifyOfficersOfNewRequest(leaveRequest: {...}) {
  // Find officers in soldier's department
  // Find all admins
  // Send push to all recipients
}
```

---

# End of Context