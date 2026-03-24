# System Architecture

## Backend (NestJS)

### Module Structure
```
backend/src/modules/
├── auth/              # JWT, OTP, WebAuthn
├── users/             # User management, department stats
├── admin/             # Admin dashboard endpoints
├── messages/          # Announcements, department messages
├── push/              # Web push notifications
├── leave-requests/    # Leave management with department scoping
├── leave-categories/  # Leave type categories
├── shift-assignments/ # Duty assignments with tracking
├── shift-schedules/   # Daily schedules
├── shift-templates/   # Time slot definitions
├── service-cycles/    # Reserve duty periods
├── service-attendance/# Soldier check-in
├── zones/             # Operational areas
├── tasks/             # Zone-specific duties
├── skills/            # Soldier qualifications
└── test-setup/        # Development testing (disabled in prod)
```

### Key Services

#### LeaveRequestsService
- `create()` - Submit request + notify officers
- `approve()` / `reject()` - With department verification
- `markReturned()` - Mark soldier back
- `verifyAccessToRequest()` - Department-scoped access control
- `notifyOfficersOfNewRequest()` - Push to department officers

#### UsersService
- `getHomeData()` - Dashboard data for user
- `getDepartmentComprehensiveStats()` - Full department overview
- `getDepartmentLeaveRequests()` - Filtered requests for officers
- `getDepartmentMessages()` - Department message history

#### MessagesService
- `create()` - Global messages (admin)
- `createDepartmentMessage()` - Department-scoped (officer)
- `findForDepartment()` - Get department messages

#### PushService
- `sendToUser()` - Individual notification
- `sendToRole()` - Role-based notification
- Uses VAPID keys for Web Push

### Guards & Decorators
- `JwtAuthGuard` - Auth requirement
- `RolesGuard` - Role checking (considers militaryRole)
- `@Roles('OFFICER')` - Endpoint role restriction

## Frontend (Next.js 14)

### App Router Structure
```
frontend/src/app/
├── auth/
│   ├── login/          # Email + password + OTP
│   ├── register/       # New user registration
│   └── passkey/        # WebAuthn setup
├── dashboard/
│   ├── home/           # Main dashboard
│   ├── shifts/         # My shifts view
│   ├── shift-duty/     # Shift officer dashboard
│   ├── department/     # OFFICER management view
│   ├── requests/       # Leave request form
│   ├── profile/        # User profile
│   └── ...
└── admin/
    ├── messages/       # Message management
    ├── shifts/         # Shift scheduling
    ├── soldiers/       # Soldier management
    └── ...
```

### Layout Components

#### UserLayout (`components/layout/UserLayout.tsx`)
- Main layout for /dashboard/* routes
- Dynamic mobile navigation based on user.role
- Desktop sidebar with flat nav items
- "More" menu for overflow items

#### AdminLayout (`components/layout/AdminLayout.tsx`)
- Layout for /admin/* routes
- Expandable sections sidebar
- Role-based section filtering
- OFFICER returns empty menu (no admin access)

#### Header (`components/layout/Header.tsx`)
- Role-based navigation links
- OFFICER: "המחלקה שלי" link
- LOGISTICS/ADMIN: "ניהול" link

### State Management

#### Zustand (Client State)
- `useAuth` hook - Auth state, user info
- `useIsAdmin`, `useIsFullAdmin` - Role checks

#### React Query (Server State)
- All API calls through `lib/api.ts`
- Query keys in `lib/queryKeys.ts`
- Automatic refetching and caching

### Key Components

#### Department Page (`app/dashboard/department/page.tsx`)
- Tabbed interface: Overview, Requests, Soldiers, Messages
- Leave request approval/rejection modals
- Department statistics cards
- Soldier list with search/filter

#### Shift Duty Page (`app/dashboard/shift-duty/page.tsx`)
- Current shift assignments
- Attendance confirmation
- Battery level reporting
- Missing items tracking

## API Communication

### Axios Instance (`lib/api.ts`)
- Base URL from env
- JWT token in cookies
- Auto-attached via interceptor
- Error handling

### Endpoints Pattern
```
GET    /api/resource          - List
GET    /api/resource/:id      - Get one
POST   /api/resource          - Create
PATCH  /api/resource/:id      - Update
DELETE /api/resource/:id      - Delete
```

### Role-Scoped Endpoints
```
# Officer department endpoints
GET /api/users/department/comprehensive-stats
GET /api/users/department/leave-requests
GET /api/users/department/messages

# Messages
POST /api/messages/department  # OFFICER only
```

## Push Notifications

### Flow
1. User grants notification permission
2. Service worker registered
3. Push subscription sent to backend
4. Backend stores in PushSubscription table
5. Events trigger `PushService.sendToUser()`

### Triggers
- Leave request created → notify officers
- Leave request approved/rejected → notify soldier
- New urgent message → notify relevant audience
