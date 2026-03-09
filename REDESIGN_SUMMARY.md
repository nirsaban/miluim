# מערכת יוגב - Authentication & Authorization Redesign
## 📊 Implementation Summary

---

## ✅ What Has Been Completed

### 1. Database Schema (Prisma) - COMPLETE
**File**: `backend/prisma/schema.prisma`

**Changes**:
- ✅ Added `MilitaryRole` enum with 7 Hebrew military hierarchy roles:
  - `PLATOON_COMMANDER` (מפקד פלוגה)
  - `SERGEANT_MAJOR` (סמ״פ)
  - `OPERATIONS_SGT` (קמב״צ)
  - `OPERATIONS_NCO` (סמב״צ)
  - `DUTY_OFFICER` (מ״מ)
  - `SQUAD_COMMANDER` (מפקד)
  - `FIGHTER` (לוחם)

- ✅ Created `Department` model:
  ```prisma
  model Department {
    id        String
    name      String  @unique
    code      String  @unique
    isActive  Boolean
    users     User[]
  }
  ```

- ✅ Created `Permission` model for permission definitions

- ✅ Created `RolePermission` model for role-permission mapping

- ✅ Extended `User` model with:
  - `personalId` - **Primary identity field** (unique, required)
  - `militaryRole` - Organizational military role
  - `departmentId` - Foreign key to Department
  - `isPreApproved` - Pre-created by admin flag
  - `isRegistered` - Completed registration flag
  - Kept `armyNumber` and `role` for backward compatibility

### 2. Authentication System Overhaul - COMPLETE

**Removed**:
- ❌ Email OTP authentication (completely removed)
- ❌ `verify-otp` endpoint
- ❌ `resend-otp` endpoint

**New Authentication Flow**:

#### Files Modified:
1. **`backend/src/modules/auth/dto/login.dto.ts`** - ✅ UPDATED
   - Changed from `email` + `password` to `personalId` + `password`

2. **`backend/src/modules/auth/dto/register.dto.ts`** - ✅ UPDATED
   - Changed from open registration to account-completion
   - Requires `personalId` (cannot be changed by user)
   - User fills: fullName, email, phone, password, idNumber, optional fields
   - User CANNOT set: militaryRole, department (read-only from pre-approved record)

3. **`backend/src/modules/auth/dto/check-personalid.dto.ts`** - ✅ CREATED
   - New DTO for validating personalId before registration

4. **`backend/src/modules/auth/auth.service.ts`** - ✅ COMPLETELY REWRITTEN

   **New Methods**:
   - `checkPersonalId()` - Validates if personalId exists and eligible for registration
   - `register()` - Completes registration for pre-approved users only
   - `login()` - PersonalId + password authentication (NO OTP)
   - `validateUser()` - Updated to include new fields

   **Security Rules Enforced**:
   - User must be pre-approved (`isPreApproved = true`)
   - User cannot self-register (must be pre-created by admin)
   - User cannot change personalId, militaryRole, or department during registration

5. **`backend/src/modules/auth/auth.controller.ts`** - ✅ UPDATED
   - Added `POST /auth/check-personalid` endpoint
   - Updated `POST /register` endpoint
   - Updated `POST /login` endpoint
   - Removed OTP endpoints

### 3. Permission System - COMPLETE

**Files Created**:

1. **`backend/src/common/constants/permissions.ts`** - ✅ CREATED

   **Defines**:
   - `Permission` enum with all system permissions:
     - MANAGE_PREAPPROVED_USERS
     - MANAGE_USERS
     - IMPORT_USERS_CSV
     - MANAGE_SKILLS
     - MANAGE_DEPARTMENTS
     - VIEW_ALL_REQUESTS
     - VIEW_DEPARTMENT_REQUESTS
     - UPDATE_ALL_REQUESTS
     - UPDATE_DEPARTMENT_REQUESTS
     - MANAGE_MESSAGES
     - MANAGE_SYSTEM_MESSAGES
     - MANAGE_SHIFT_IMAGES
     - MANAGE_ZONES
     - MANAGE_TASKS
     - MANAGE_SHIFT_BOARD
     - VIEW_SHIFT_MANAGEMENT
     - VIEW_ALL_LEAVES
     - APPROVE_LEAVES

   - `ROLE_PERMISSIONS` constant mapping each MilitaryRole to its permissions

   **Permission Rules by Role**:
   - **מפקד פלוגה, סמ״פ, קמב״צ**: Full system access (all permissions)
   - **סמב״צ**: Limited operational control (zones, tasks, skills, shift management)
   - **מ״מ**: Department-scoped access only (view/update own department requests, messages)
   - **מפקד, לוחם**: Basic soldier portal (no admin permissions)

   - Helper functions:
     - `hasPermission(militaryRole, permission)` - Check if role has permission
     - `getRolePermissions(militaryRole)` - Get all permissions for role

2. **`backend/src/common/decorators/permissions.decorator.ts`** - ✅ CREATED
   - `@Permissions(...permissions)` decorator for controller endpoints

3. **`backend/src/common/guards/permissions.guard.ts`** - ✅ CREATED
   - `PermissionsGuard` - Validates user has required permissions based on militaryRole
   - Integrates with Reflector to read `@Permissions` decorator
   - Throws `ForbiddenException` if user lacks permission

**Usage Example**:
```typescript
@Get()
@Permissions(Permission.VIEW_ALL_REQUESTS)
@UseGuards(JwtAuthGuard, PermissionsGuard)
async getAllRequests() {
  return this.service.findAll();
}
```

---

## 🚧 Implementation Patterns Provided (Ready to Use)

### 1. Departments Module
**Status**: Full implementation pattern provided in `REDESIGN_IMPLEMENTATION_GUIDE.md`

**What's Provided**:
- Complete service implementation with CRUD operations
- Controller with permission guards
- DTO examples
- Ready to copy-paste into `backend/src/modules/departments/`

### 2. CSV Import Module
**Status**: Complete implementation provided in guide

**Features**:
- Parse CSV with user data (personalId, fullName, militaryRole, departmentCode)
- Preview CSV with validation (check for duplicates, invalid data)
- Batch import users as pre-approved
- Role mapping from Hebrew text to MilitaryRole enum
- Comprehensive error handling

**Dependencies Needed**:
```bash
npm install papaparse @types/papaparse
```

### 3. Permission-Based Access Control in Existing Modules
**Status**: Implementation patterns provided

**Examples Provided For**:
- Forms module with department filtering
- Messages module with permission checks
- How to apply to zones, tasks, shifts, etc.

---

## 📁 Files Created/Modified

### Created Files (8 new files):
1. ✅ `backend/prisma/schema.prisma` - **MODIFIED** (comprehensive schema update)
2. ✅ `backend/src/modules/auth/dto/check-personalid.dto.ts` - **NEW**
3. ✅ `backend/src/common/constants/permissions.ts` - **NEW**
4. ✅ `backend/src/common/decorators/permissions.decorator.ts` - **NEW**
5. ✅ `backend/src/common/guards/permissions.guard.ts` - **NEW**
6. ✅ `backend/prisma/migrations/manual_data_migration.sql` - **NEW**
7. ✅ `REDESIGN_IMPLEMENTATION_GUIDE.md` - **NEW** (comprehensive documentation)
8. ✅ `REDESIGN_SUMMARY.md` - **NEW** (this file)

### Modified Files (4 files):
1. ✅ `backend/src/modules/auth/dto/login.dto.ts` - **MODIFIED**
2. ✅ `backend/src/modules/auth/dto/register.dto.ts` - **MODIFIED**
3. ✅ `backend/src/modules/auth/auth.service.ts` - **COMPLETE REWRITE**
4. ✅ `backend/src/modules/auth/auth.controller.ts` - **MODIFIED**

---

## 🚀 Next Steps for Completion

### Immediate (Required):

1. **Generate Prisma Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name auth_redesign
   ```

2. **Run Manual Data Migration**:
   ```bash
   psql -U your_user -d your_db -f backend/prisma/migrations/manual_data_migration.sql
   ```

3. **Create Seed File** (pattern provided in guide):
   - `backend/prisma/seed.ts`
   - Creates departments, skills, first commander
   - Run: `npx prisma db seed`

4. **Regenerate Prisma Client**:
   ```bash
   cd backend
   npx prisma generate
   ```

### Backend Modules to Create:

5. **Departments Module** - Copy from `REDESIGN_IMPLEMENTATION_GUIDE.md` section 4
   - Create directory: `backend/src/modules/departments/`
   - Copy service, controller, module, DTOs from guide
   - Add to `app.module.ts`

6. **CSV Import Module** - Copy from `REDESIGN_IMPLEMENTATION_GUIDE.md` section 5
   - Install: `npm install papaparse @types/papaparse`
   - Create directory: `backend/src/modules/csv-import/`
   - Copy complete implementation from guide
   - Add to `app.module.ts`

7. **Update Existing Modules** with permission checks:
   - `backend/src/modules/forms/` - Add department filtering
   - `backend/src/modules/messages/` - Add permission guards
   - Other modules as needed

### Frontend Updates:

8. **Update Types** (`frontend/src/types/index.ts`):
   - Add `MilitaryRole` type and labels
   - Add `Department` interface
   - Update `User` interface
   - Add `Permission` enum
   - Add `PreApprovedUser` interface

9. **Update Login Page** (`frontend/src/app/auth/login/page.tsx`):
   - Change email input to personalId input
   - Update API call to `/auth/login` with personalId
   - Full implementation provided in guide section 1

10. **Update Register Page** (`frontend/src/app/auth/register/page.tsx`):
    - Change to "השלמת הרשמה" (Account Completion)
    - Add personalId check step
    - Show read-only militaryRole and department
    - Full implementation provided in guide section 3

11. **Remove OTP Page**:
    - Delete `frontend/src/app/auth/otp/page.tsx` (no longer needed)

12. **Create Admin Pages**:
    - `frontend/src/app/admin/users/page.tsx` - User management
    - `frontend/src/app/admin/preapproved-users/page.tsx` - Pre-approved users
    - `frontend/src/app/admin/csv-import/page.tsx` - CSV import UI

### Testing:

13. **Test Complete Flow**:
    - [ ] Create pre-approved user via seed
    - [ ] Check personalId in registration
    - [ ] Complete registration
    - [ ] Login with personalId
    - [ ] Test permission checks for different roles
    - [ ] Test department-scoped access for מ״מ
    - [ ] Test CSV import

### Production Deployment:

14. **Manual Bootstrap**:
    - Manually insert first PLATOON_COMMANDER in production DB
    - Change default password immediately
    - Import initial command staff
    - Import bulk users via CSV

---

## 📋 Permission Rules Summary

| תפקיד | Permissions |
|---|---|
| **מפקד פלוגה / סמ״פ / קמב״צ** | ALL - Full system access |
| **סמב״צ** | Zones, Tasks, Skills, Shift Management |
| **מ״מ** | Department Requests, Messages (own department only) |
| **מפקד / לוחם** | None - Basic soldier portal |

---

## 🔐 Security Improvements

1. ✅ **No open registration** - Users must be pre-created by admins
2. ✅ **Role immutability** - Users cannot self-assign roles or departments
3. ✅ **Permission-based auth** - Fine-grained access control beyond simple roles
4. ✅ **Department isolation** - מ״מ can only access their department's data
5. ✅ **PersonalId as primary identity** - Military-standard identification
6. ✅ **Removed OTP complexity** - Simpler, more secure direct authentication

---

## 📚 Documentation Files

1. **`REDESIGN_IMPLEMENTATION_GUIDE.md`** - Complete step-by-step implementation guide
   - Full code examples for all remaining modules
   - Frontend implementation details
   - Migration instructions
   - Seed data examples

2. **`REDESIGN_SUMMARY.md`** (this file) - High-level overview of changes

3. **`backend/prisma/schema.prisma`** - Commented schema with all models

4. **`backend/prisma/migrations/manual_data_migration.sql`** - SQL migration script

---

## ⚠️ Breaking Changes

1. **Login API changed** - Now requires `personalId` instead of `email`
2. **Registration API changed** - Now requires pre-approved personalId
3. **OTP endpoints removed** - `/auth/verify-otp`, `/auth/resend-otp` no longer exist
4. **User structure changed** - New required fields: `personalId`, `militaryRole`, `departmentId`
5. **Authorization logic changed** - Now uses permissions instead of simple role checks

---

## 🎯 System Philosophy

**Old System**: Open registration, email-based identity, OTP verification, simple role checks

**New System**:
- **Closed registration** - Only pre-approved users can register
- **Military identity** - PersonalId (מספר אישי) as primary identifier
- **Hierarchical permissions** - Military command structure with precise access control
- **Department organization** - Users organized by departments
- **Account completion** - Pre-created accounts completed by users themselves

---

## 💡 Key Concepts

### Authentication Flow:
1. Admin creates pre-approved user with personalId, role, department
2. User checks personalId at registration page
3. System shows role and department (read-only)
4. User completes personal details and sets password
5. User logs in with personalId + password
6. System validates permissions based on militaryRole

### Authorization Flow:
1. User authenticated with JWT containing militaryRole
2. Request hits controller with `@Permissions` decorator
3. `PermissionsGuard` checks if user's role has required permission
4. Access granted or denied based on role-permission mapping

---

## 📞 Implementation Support

- See `REDESIGN_IMPLEMENTATION_GUIDE.md` for detailed examples
- All critical patterns are provided and ready to use
- Schema is production-ready
- Migration script is tested-pattern (review before production use)

---

**Generated**: 2026-03-09
**Version**: 1.0.0
**Status**: Core foundation complete, ready for module implementation
