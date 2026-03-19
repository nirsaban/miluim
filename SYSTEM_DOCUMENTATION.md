# Yogev System - Military Reserve Platoon Management Platform

## The Story: Why This System Exists

Picture this: A reserve platoon in the IDF (Israel Defense Forces) gets called up for duty. Dozens of soldiers need to coordinate their arrival, get assigned to guard shifts, request short leaves to handle personal errands, and stay informed about operational updates - all while commanders need real-time visibility into who's on base, who's on duty, and what's happening at any moment.

Before Yogev System, this was managed through WhatsApp groups, Excel spreadsheets, and endless phone calls. Commanders couldn't easily see the status of their soldiers, shift assignments were chaotic, and tracking who went out for a quick break became a nightmare.

**Yogev System was born to solve this chaos.**

It's a mobile-first, Hebrew RTL (right-to-left) web application that digitizes every aspect of reserve duty management - from the moment a service cycle begins until the last soldier checks out.

---

## Part 1: The People - User Roles & Permissions

The system recognizes that a military unit is hierarchical, and different roles need different levels of access. Here's who uses the system:

### Authorization Roles (What You Can Do)

| Role | Hebrew | Access Level |
|------|--------|--------------|
| **SOLDIER** | חייל | Basic access - view shifts, request leave, see announcements |
| **COMMANDER** | מפקד | Like soldier + receives command-level notifications |
| **OFFICER** | קצין | Manages their department + approves leave requests |
| **LOGISTICS** | לוגיסטיקה | Manages shifts, zones, operational links |
| **ADMIN** | מנהל | Full system control - manages everything |

### Military Roles (Who You Are)

Beyond permissions, soldiers have military identities:
- **PLATOON_COMMANDER** (מפקד פלוגה) - The platoon leader
- **SERGEANT_MAJOR** (סמ״פ) - Senior NCO
- **OPERATIONS_SGT** (קמב״צ) - Operations sergeant
- **DUTY_OFFICER** (מ״מ) - Daily duty officer
- **SQUAD_COMMANDER** (מפקד) - Squad leader
- **FIGHTER** (לוחם) - Basic soldier

This dual-role system separates *what you can do* from *who you are* in the chain of command.

---

## Part 2: The Journey - How Users Flow Through the System

### Act 1: Getting Into the System (Onboarding)

**The Admin's Setup:**
Before any service cycle begins, an admin pre-registers all soldiers using the CSV Import feature. Each soldier is added with:
- Personal ID (מספר אישי) - their unique military identifier
- Full name
- Phone number
- Army number
- Basic role assignment

These soldiers are marked as "pre-approved" but not yet "registered."

**The Soldier's First Login:**
When a soldier tries to use the system for the first time:

1. **Check Personal ID** - They enter their military personal ID
2. **System Verification** - The system checks if they're pre-approved
3. **Complete Registration** - They fill in:
   - Email address
   - Password
   - National ID number
   - Daily job (civilian occupation)
   - City of residence
   - Field of study
   - Birthday
   - Skills (driver, medic, radio operator, etc.)
   - Department selection

4. **Login** - With credentials set, they can now log in

**Authentication Options:**
- **Password + OTP**: Traditional login with email verification code
- **Passkey/WebAuthn**: Biometric login using Face ID, Touch ID, or device PIN - secure and convenient

### Act 2: The Service Cycle Begins (Reserve Duty)

When the platoon is called up for reserve service, an admin creates a **Reserve Service Cycle** (סבב מילואים).

**Creating a Service Cycle:**
- Name: "November 2024 Reserve Duty"
- Start/End dates
- Location (base name)
- Status: PLANNED → ACTIVE → COMPLETED

**What Happens When Activated:**
The system automatically creates attendance records for every active soldier. Each soldier now needs to confirm their status:
- **ARRIVED** (הגעתי) - On base
- **NOT_COMING** (לא מגיע) - Can't attend (must provide reason)
- **LATE** (איחור) - Coming late
- **PENDING** (ממתין) - Haven't responded yet

**Onboarding Details:**
When soldiers arrive, commanders can record:
- Weapon number (מספר נשק)
- Hotel room number (for off-base housing)
- Any notes

### Act 3: Daily Operations - Shifts, Guards, and Tasks

This is where the magic happens. Every day, soldiers need to be assigned to various duties.

#### The Shift System Architecture

**Zones (אזורים):**
Physical areas that need coverage:
- Main Gate (שער ראשי)
- Perimeter (היקפי)
- Command Post (חמ״ל)

**Tasks (משימות):**
Specific duties within zones:
- Guard duty at Main Gate (requires 2 people)
- Patrol in Perimeter (requires 2 people)
- Each task specifies how many soldiers are needed

**Shift Templates:**
Time slots that repeat daily:
- Morning (בוקר): 06:00-14:00 🟡
- Afternoon (צהריים): 14:00-22:00 🔵
- Night (לילה): 22:00-06:00 🟣

#### Building the Shift Schedule

Logistics officers use a drag-and-drop interface to build daily schedules:

1. **Select Date** - Choose which day to schedule
2. **View Available Soldiers** - See who's on base (arrived to service cycle) and not on leave
3. **Drag & Drop** - Assign soldiers to tasks within shift templates
4. **Smart Validation:**
   - Can't assign someone to consecutive shifts (no morning then afternoon)
   - Can't assign someone already on leave
   - Shows how many people each task needs vs. how many assigned
5. **Assign Shift Officer** - One person responsible for the day's operations
6. **Publish** - Make the schedule visible to soldiers

#### During an Active Shift

Soldiers see their daily assignment on their home screen:
- Current shift details
- Task and zone
- Teammates in the same shift
- Shift officer contact

**Shift Officer Dashboard:**
The designated shift officer sees:
- All soldiers on duty
- Who has confirmed arrival
- Battery levels (soldiers can report radio battery %)
- Missing equipment reports
- Quick actions to mark attendance

### Act 4: Leave Requests (יציאות)

Life doesn't stop during reserve duty. Soldiers need to leave base for various reasons.

**Leave Types:**
- **SHORT (יציאה קצרה)** - Quick errands (requires category)
- **HOME (יציאה הביתה)** - Going home for the night

**Leave Categories (for short leaves):**
- Shopping (קניות)
- Medical (רפואי)
- Personal (אישי)

**The Leave Flow:**

1. **Soldier Requests:**
   - Type of leave
   - Exit time
   - Expected return time
   - Reason (optional)

2. **Officer Reviews:**
   - Sees pending requests
   - Approves or rejects with optional note

3. **Status Tracking:**
   - PENDING → APPROVED → ACTIVE → RETURNED
   - Or PENDING → REJECTED
   - OVERDUE if past expected return

4. **Return Confirmation:**
   - Admin can mark return
   - Soldier can self-confirm return (new feature!)

**Leave Dashboard (Admin View):**
- Who's on base vs. out
- Breakdown by leave type
- Overdue soldiers (past expected return)
- Real-time status

### Act 5: Communication (הודעות)

Commanders need to communicate with soldiers effectively.

**Message Types:**
- **GENERAL** - Routine announcements
- **URGENT** - Critical information
- **FOOD** - Meal schedules
- **OPERATIONAL** - Mission-related
- **ANNOUNCEMENT** - Official notices

**Message Features:**
- **Priority Levels:** LOW, MEDIUM, HIGH, CRITICAL
- **Target Audiences:**
  - ALL - Everyone sees it
  - COMMANDERS_PLUS - Commander level and up
  - OFFICERS_PLUS - Officers and admins only
  - ADMIN_ONLY - Just admins
- **Read Confirmation:** Messages can require soldiers to confirm they read them
- **Push Notifications:** Urgent/high-priority messages trigger push notifications

**Confirmation Tracking:**
Admins can see:
- Who read the message
- Who hasn't read it
- Confirmation percentage
- Timeline of confirmations

---

## Part 3: Supporting Features

### Skills & Qualifications (כישורים)

Soldiers have skills that affect their assignments:
- **DRIVER** (נהג) - Can drive military vehicles
- **MEDIC** (חובש) - Medical training
- **RADIO** (קשר) - Radio operator
- **SNIPER** (צלף) - Designated marksman
- **COMMANDER** (מפקד) - Leadership qualified

These are used to suggest appropriate soldiers for tasks.

### Departments (מחלקות)

Organizational units within the platoon:
- Platoon 1 (פלוגה א)
- Platoon 2 (פלוגה ב)
- Support (תמיכה)

Officers manage soldiers in their department.

### Operational Links (קישורים מבצעיים)

Quick-access links to important resources:
- Base procedures document
- Emergency contacts
- Operational maps
- External systems

### Service Checklist (צ'קליסט)

Admin checklist for service cycle preparation:
- Categories: Staff, Vehicles, Logistics, Hotel, Weapons, General
- Track completion status
- Assign responsibility

### Workload Analytics

Track shift fairness:
- Total shifts per soldier
- Shifts by type (morning/afternoon/night)
- Monthly trends
- Task breakdown

### Social Features (חברתי)

Light social features for morale:
- Photo sharing
- Recommendations (restaurants near base, activities)

---

## Part 4: Technical Architecture

### Stack Overview

**Backend:**
- **NestJS** - Node.js framework with TypeScript
- **Prisma ORM** - Database abstraction layer
- **PostgreSQL 16** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **WebAuthn** - Passkey/biometric authentication

**Frontend:**
- **Next.js 14** (App Router) - React framework
- **React Query (TanStack)** - Server state management
- **Zustand** - Client state management
- **TailwindCSS** - Styling with RTL support
- **dnd-kit** - Drag and drop for shift assignments

**Infrastructure:**
- **Docker** - Containerization
- **Gmail API** - OTP email delivery
- **Web Push API** - Push notifications (VAPID)

### Database Schema Overview

**Core Entities:**
- `User` - Soldiers and staff with roles
- `Department` - Organizational units
- `Skill` / `SoldierSkill` - Qualifications

**Service Cycle:**
- `ReserveServiceCycle` - The duty period
- `ServiceAttendance` - Who's on base
- `ServiceAdminChecklist` - Preparation tasks
- `ServiceVehicle` - Vehicle assignments

**Shifts:**
- `Zone` - Physical areas
- `Task` - Duties with required headcount
- `ShiftTemplate` - Time slots
- `ShiftSchedule` - Daily schedule with shift officer
- `ShiftAssignment` - Soldier → Task mapping

**Leave Management:**
- `LeaveCategory` - Types of short leaves
- `LeaveRequest` - Individual requests with status

**Communication:**
- `Message` - Announcements
- `MessageConfirmation` - Read receipts
- `Notification` - System notifications
- `PushSubscription` - Web push endpoints

### API Structure

All endpoints are prefixed with `/api/` and most require JWT authentication.

**Key Endpoint Groups:**
- `/auth/*` - Login, register, OTP, WebAuthn
- `/users/*` - Profile, home data, departments
- `/service-cycles/*` - Reserve duty management
- `/service-attendance/*` - Soldier check-in
- `/shift-assignments/*` - Duty scheduling
- `/shift-schedules/*` - Daily schedules
- `/leave-requests/*` - Leave management
- `/messages/*` - Communication
- `/admin/*` - Administrative functions

### Security Features

1. **JWT Authentication** with expiration
2. **OTP Verification** for sensitive operations
3. **WebAuthn/Passkeys** for passwordless login
4. **Role-Based Access Control** on all endpoints
5. **HTTPS Only** in production
6. **Input Validation** via class-validator DTOs

---

## Part 5: User Experience Flows

### Soldier Daily Flow

```
Morning:
1. Open app → See today's shift on home screen
2. Confirm arrival when shift starts
3. Report battery level / equipment status
4. See teammates and shift officer contact

During day:
5. Need to leave? Submit leave request
6. Get push notification when approved
7. Leave base
8. Confirm return when back

Evening:
9. Check tomorrow's schedule
10. Read any new messages
11. Confirm reading critical messages
```

### Commander Daily Flow

```
Morning:
1. Check service attendance dashboard
2. See who hasn't arrived
3. Review pending leave requests
4. Approve/reject as needed

During day:
5. Monitor active leaves
6. Track overdue soldiers
7. Send announcements if needed
8. Check shift coverage

Evening:
9. Review next day's schedule
10. Ensure all positions filled
11. Check message confirmations
```

### Logistics Daily Flow

```
Before service:
1. Set up zones and tasks
2. Configure shift templates
3. Prepare operational links

During service:
4. Build daily shift schedules
5. Drag-drop soldiers to tasks
6. Assign shift officers
7. Publish schedules
8. Monitor workload balance
```

---

## Part 6: The Numbers

### Status Enums Reference

**Leave Status:**
- `PENDING` - Awaiting approval
- `APPROVED` - Approved, not yet active
- `REJECTED` - Request denied
- `ACTIVE` - Soldier is out
- `RETURNED` - Back on base
- `OVERDUE` - Past expected return

**Service Attendance:**
- `PENDING` - No response
- `ARRIVED` - On base
- `NOT_COMING` - Unable to attend
- `LATE` - Coming late
- `LEFT_EARLY` - Left before end

**Shift Assignment:**
- `PENDING` - Not confirmed
- `CONFIRMED` - Arrival confirmed
- `COMPLETED` - Shift done
- `CANCELLED` - Assignment cancelled

---

## Part 7: Future Capabilities

The architecture supports future enhancements:

1. **Automatic Scheduling** - AI-powered shift generation based on availability, skills, and fairness
2. **Vehicle Management** - Track military vehicles per service cycle
3. **Equipment Tracking** - Monitor weapons, radios, other gear
4. **Integration with IDF Systems** - Sync with official military databases
5. **Analytics Dashboard** - Historical trends, predictions
6. **Mobile App** - Native iOS/Android apps

---

## Conclusion

Yogev System transforms the chaotic, manual process of reserve duty management into a streamlined digital experience. Every stakeholder - from the individual soldier checking their shift to the platoon commander monitoring attendance - has exactly the tools they need.

The system respects military hierarchy while enabling modern, mobile-first workflows. It's built with security in mind (important for military applications) while remaining accessible to soldiers who might not be tech-savvy.

Most importantly, it answers the fundamental questions commanders ask every day:
- **Who's on base?**
- **Who's on duty?**
- **Where is everyone?**
- **What needs to happen today?**

With Yogev System, those answers are always one tap away.

---

*Built with care for the soldiers who serve.* 🇮🇱
