# Database Schema Reference

Schema located at: `backend/prisma/schema.prisma`

## Core Enums

### UserRole (Authorization Levels)
```
SOLDIER     - Basic access
COMMANDER   - Soldier + command notifications
OFFICER     - Department management + leave approvals
LOGISTICS   - Shifts, zones, operational links
ADMIN       - Full system access
```

### MilitaryRole (Organizational Identity)
```
PLATOON_COMMANDER  - מפקד פלוגה (→ ADMIN permissions)
SERGEANT_MAJOR     - סמ״פ (→ ADMIN permissions)
OPERATIONS_SGT     - קמב״צ (→ ADMIN permissions)
OPERATIONS_NCO     - סמב״צ
DUTY_OFFICER       - מ״מ (→ OFFICER permissions)
SQUAD_COMMANDER    - מפקד
FIGHTER            - לוחם
```

### LeaveStatus
```
PENDING   - Awaiting approval
APPROVED  - Approved, not yet active
REJECTED  - Denied
ACTIVE    - Soldier currently out
RETURNED  - Back on base
OVERDUE   - Past expected return time
```

### ShiftAssignmentStatus
```
PENDING    - Not confirmed
CONFIRMED  - Soldier confirmed arrival
COMPLETED  - Shift finished
CANCELLED  - Assignment cancelled
```

## Key Models

### User
```prisma
model User {
  id            String       @id @default(uuid())
  personalId    String       @unique
  fullName      String
  email         String       @unique
  phone         String
  passwordHash  String
  militaryRole  MilitaryRole @default(FIGHTER)
  role          UserRole     @default(SOLDIER)
  departmentId  String?
  department    Department?
  isActive      Boolean      @default(true)
  // ... other fields
}
```

### Department
```prisma
model Department {
  id       String  @id @default(uuid())
  name     String  @unique
  code     String  @unique
  isActive Boolean @default(true)
  users    User[]
}
```

### LeaveRequest
```prisma
model LeaveRequest {
  id              String         @id @default(uuid())
  soldierId       String
  soldier         User
  type            LeaveType      // SHORT or HOME
  categoryId      String?
  category        LeaveCategory?
  reason          String?
  exitTime        DateTime
  expectedReturn  DateTime
  actualReturn    DateTime?
  status          LeaveStatus    @default(PENDING)
  approvedById    String?
  approvedBy      User?
  adminNote       String?
}
```

### Message (with department scoping)
```prisma
model Message {
  id                   String                @id @default(uuid())
  title                String
  content              String
  type                 MessageType
  priority             MessagePriority
  targetAudience       MessageTargetAudience
  requiresConfirmation Boolean
  isActive             Boolean
  departmentId         String?               // NEW: For department-scoped messages
  department           Department?
  createdById          String?
  confirmations        MessageConfirmation[]
}
```

### ShiftAssignment (with tracking fields)
```prisma
model ShiftAssignment {
  id              String                @id @default(uuid())
  scheduleId      String?
  date            DateTime              @db.Date
  shiftTemplateId String
  taskId          String
  soldierId       String
  status          ShiftAssignmentStatus @default(PENDING)
  notes           String?
  arrivedAt       DateTime?             // When confirmed arrival
  batteryLevel    Int                   @default(0)
  missingItems    String?               // Free text
}
```

### ReserveServiceCycle
```prisma
model ReserveServiceCycle {
  id          String                    @id @default(uuid())
  name        String
  description String?
  startDate   DateTime                  @db.Date
  endDate     DateTime?                 @db.Date
  location    String?
  status      ReserveServiceCycleStatus // PLANNED, ACTIVE, COMPLETED, CANCELLED
  attendances ServiceAttendance[]
}
```

## Relations to Remember

1. **User ↔ Department**: Many-to-one (user.departmentId)
2. **LeaveRequest ↔ User**: soldier + approvedBy relations
3. **Message ↔ Department**: Optional department scoping
4. **ShiftAssignment ↔ User**: soldier relation
5. **ServiceAttendance ↔ User + ReserveServiceCycle**: Tracks who attended each cycle

## Recent Schema Changes

### March 2026
- Added `departmentId` to Message model for department-scoped messages
- Verified ShiftAssignment has batteryLevel and missingItems fields
