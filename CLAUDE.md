# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yogev System - A military reserve platoon management system (IDF) for managing soldiers, shifts, leave requests, service cycles, and internal communications. Hebrew RTL interface.

## Tech Stack

- **Backend**: NestJS + Prisma ORM + PostgreSQL 16
- **Frontend**: Next.js 14 (App Router) + React Query + Zustand
- **Styling**: TailwindCSS (RTL support, military theme)
- **Auth**: JWT + Email OTP + WebAuthn/Passkeys

## Development Commands

### Backend (from /backend)
```bash
npm run start:dev        # Start with hot reload (port 3001)
npm run build            # Build for production
npm run lint             # Run ESLint with auto-fix
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npx prisma studio        # Open database GUI (port 5555)
npx prisma migrate dev   # Create new migration
npx prisma db seed       # Seed database
npx prisma db push       # Push schema changes without migration
```

### Frontend (from /frontend)
```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run lint             # Run ESLint
```

### Database
```bash
docker-compose -f docker-compose.dev.yml up -d   # Start PostgreSQL
docker exec -it yogev-postgres psql -U yogev -d yogev_db  # Connect to DB
```

## Architecture

### Backend Structure (NestJS)
```
backend/src/
├── modules/           # Feature modules (each with controller, service, DTOs)
│   ├── auth/          # JWT auth, OTP verification, WebAuthn
│   ├── users/         # User management
│   ├── admin/         # Admin dashboard, soldier management
│   ├── messages/      # Announcements with confirmation tracking
│   ├── shifts/        # Legacy shift posts
│   ├── shift-*        # New shift system (templates, schedules, assignments)
│   ├── service-*      # Reserve service cycles (מילואים)
│   ├── leave-*        # Leave requests and categories
│   └── ...
├── prisma/            # Prisma service wrapper
├── email/             # Gmail API integration
└── upload/            # File upload service (Multer)
```

### Frontend Structure (Next.js App Router)
```
frontend/src/
├── app/
│   ├── auth/          # Login, OTP, register, passkey setup
│   ├── dashboard/     # Soldier-facing pages
│   └── admin/         # Admin-only pages
├── components/
│   ├── ui/            # Reusable UI components (Button, Card, Input, etc.)
│   └── layout/        # AuthLayout, Header
├── hooks/             # useAuth, usePushNotifications
└── lib/
    ├── api.ts         # Axios instance with auth interceptors
    ├── queryKeys.ts   # React Query keys
    └── webauthn.ts    # WebAuthn client utilities
```

### Database Schema
Located at `backend/prisma/schema.prisma` - defines all models, enums, and relations.

### Key Data Models
- **User**: Has `UserRole` (permissions: SOLDIER→ADMIN) and `MilitaryRole` (organizational: FIGHTER→PLATOON_COMMANDER)
- **Department**: Organizational unit, linked to users
- **ShiftSchedule/ShiftAssignment**: New shift management system with zones, tasks, and templates
- **ReserveServiceCycle**: Tracks מילואים (reserve service) periods with attendance and checklists
- **LeaveRequest**: Short/home leave with approval workflow

### Auth Flow
1. User logs in with email/password → receives OTP via email
2. OTP verification returns JWT token
3. Optional: User can register WebAuthn passkey for biometric login
4. Token stored in cookies, auto-attached via Axios interceptor

### API Pattern
- All endpoints prefixed with `/api/`
- Auth-protected routes use `@UseGuards(JwtAuthGuard)`
- Role-based access via `@Roles()` decorator
- DTOs use class-validator for input validation

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` / `JWT_EXPIRATION` - Auth token config
- `GMAIL_*` - Gmail API OAuth credentials for OTP emails
- `VAPID_*` - Web Push notification keys

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001/api)

## Important Notes

- RTL layout throughout - use TailwindCSS RTL utilities
- OTP codes logged to console when Gmail not configured
- Uploads stored in `backend/uploads/`
- PostgreSQL runs on port 5433 (not default 5432)
- The database schema is located at `backend/prisma/schema.prisma`

## Role-Based Access Control

### User Roles (Authorization)
- **SOLDIER** - Basic access: view shifts, request leave, see announcements
- **COMMANDER** - Like soldier + receives command-level notifications
- **OFFICER** - Manages their department + approves leave requests (uses `/dashboard/department`)
- **LOGISTICS** - Manages shifts, zones, operational links (uses `/admin/*` - limited sections)
- **ADMIN** - Full system control

### Military Roles (Organizational Identity)
Admin-level military roles get ADMIN permissions:
- PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT

DUTY_OFFICER military role gets OFFICER permissions for leave management.

### Navigation by Role
- **OFFICER**: Header shows "המחלקה שלי", mobile nav shows "מחלקה"
- **LOGISTICS/ADMIN**: Header shows "ניהול", full/limited admin access
- **SOLDIER/COMMANDER**: Standard user navigation

## Key API Endpoints

### Department Management (OFFICER role)
```
GET  /users/department/comprehensive-stats  - Stats, attendance, leaves
GET  /users/department/leave-requests       - Filtered leave requests
GET  /users/department/messages             - Department message history
POST /messages/department                   - Send department-scoped message
```

### Leave Requests
```
GET    /leave-requests/my           - User's own requests
POST   /leave-requests              - Submit new request (triggers push to officers)
DELETE /leave-requests/:id          - Cancel own request
PATCH  /leave-requests/my/:id/return - Self-confirm return

# Officer endpoints (department-scoped)
GET   /leave-requests/dashboard     - Leave dashboard stats
GET   /leave-requests/pending       - Pending approvals
GET   /leave-requests/active        - Currently out
GET   /leave-requests/overdue       - Past expected return
PATCH /leave-requests/:id/approve   - Approve request
PATCH /leave-requests/:id/reject    - Reject request
PATCH /leave-requests/:id/return    - Mark soldier returned
```

### Shift Assignments
```
GET   /shift-assignments/my-today    - Current shift assignment
GET   /shift-assignments/shift-duty  - Shift officer dashboard
PATCH /shift-assignments/:id/confirm - Confirm arrival
PATCH /shift-assignments/:id/battery - Update battery level
PATCH /shift-assignments/:id/missing - Report missing items
```

### Messages
```
GET  /messages/my-department  - Department messages for home page
POST /messages/department     - Create department message (OFFICER)
GET  /messages                - All messages (filtered by audience)
POST /messages                - Create global message (ADMIN/LOGISTICS)
```

## Recent Changes (March 2026)

### OFFICER Department Management
- Comprehensive `/dashboard/department` with tabs: Overview, Requests, Soldiers, Messages
- Officers removed from admin panel access
- Leave request approval with department scoping
- Push notifications sent to officers when soldiers submit leave requests

### Push Notification Flow
```typescript
// LeaveRequestsService.notifyOfficersOfNewRequest()
// - Finds officers in soldier's department
// - Sends push via PushService
// - Also notifies ADMIN users
```

### Access Verification
```typescript
// LeaveRequestsService.verifyAccessToRequest()
// - ADMIN: access all
// - OFFICER: only same department
// - Used in approve/reject/return endpoints
```

### Mobile Navigation
Dynamic based on user.role:
- OFFICER: בית, משמרות, מחלקה, פרופיל
- Others: בית, משמרות, בקשות וטפסים, פרופיל

### Key Files for Role-Based Features
- `frontend/src/components/layout/UserLayout.tsx` - Mobile nav by role
- `frontend/src/components/layout/Header.tsx` - Desktop nav links
- `frontend/src/components/layout/AdminLayout.tsx` - Admin panel filtering
- `frontend/src/app/dashboard/department/page.tsx` - OFFICER dashboard
- `backend/src/modules/leave-requests/leave-requests.service.ts` - Access control
- `backend/src/common/guards/roles.guard.ts` - Role checking with military roles