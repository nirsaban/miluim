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
