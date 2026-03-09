# מערכת יוגב - Authentication & Authorization Redesign Implementation Guide

## סטטוס: התקדמות יישום

### ✅ הושלם

#### 1. Schema Changes (Prisma)
- ✅ Added `MilitaryRole` enum with Hebrew military hierarchy
- ✅ Added `Department` model
- ✅ Added `Permission` and `RolePermission` models
- ✅ Extended `User` model with:
  - `personalId` (unique, primary identifier)
  - `militaryRole`
  - `departmentId` (relation)
  - `isPreApproved` flag
  - `isRegistered` flag
  - Kept `armyNumber` for backward compatibility

#### 2. Backend - Auth Module
- ✅ Updated `LoginDto` - now uses `personalId` instead of email
- ✅ Updated `RegisterDto` - for account completion flow
- ✅ Created `CheckPersonalIdDto` - for pre-registration validation
- ✅ **Completely rewrote `AuthService`**:
  - `checkPersonalId()` - validates if personalId exists and is eligible
  - `register()` - completes registration for pre-approved users
  - `login()` - personalId + password authentication (NO OTP)
  - Removed all OTP functionality
- ✅ Updated `AuthController` - removed OTP endpoints, added check-personalid

#### 3. Backend - Permissions System
- ✅ Created `backend/src/common/constants/permissions.ts`:
  - Defined all permission keys as enum
  - Created `ROLE_PERMISSIONS` mapping for each MilitaryRole
  - Helper functions: `hasPermission()`, `getRolePermissions()`
- ✅ Created `Permissions` decorator
- ✅ Created `PermissionsGuard` - checks if user's militaryRole has required permission

### 🚧 נותר ליישום (Backend)

#### 4. Departments Module
**Location**: `backend/src/modules/departments/`

**Files to create**:
```
departments/
├── departments.module.ts
├── departments.controller.ts
├── departments.service.ts
└── dto/
    ├── create-department.dto.ts
    └── update-department.dto.ts
```

**Implementation**:
```typescript
// departments.service.ts
@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { users: true } },
      },
    });
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  // ... update, delete methods
}

// departments.controller.ts
@Controller('departments')
export class DepartmentsController {
  constructor(private service: DepartmentsService) {}

  @Get()
  @Permissions(Permission.MANAGE_DEPARTMENTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Permissions(Permission.MANAGE_DEPARTMENTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }
}
```

#### 5. CSV Import Module
**Location**: `backend/src/modules/csv-import/`

**Required packages**:
```bash
npm install papaparse @types/papaparse
```

**Implementation Pattern**:
```typescript
// csv-import.service.ts
import * as Papa from 'papaparse';

interface CsvRow {
  fullName: string;
  personalId: string;
  militaryRole: string;
  departmentCode: string;
}

@Injectable()
export class CsvImportService {
  constructor(private prisma: PrismaService) {}

  async previewCsv(fileBuffer: Buffer): Promise<{
    totalRows: number;
    validRows: CsvRow[];
    errors: string[];
  }> {
    const csvText = fileBuffer.toString('utf-8');
    const result = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const errors: string[] = [];
    const validRows: CsvRow[] = [];

    for (const [index, row] of result.data.entries()) {
      // Validate each row
      if (!row.personalId) {
        errors.push(`שורה ${index + 1}: חסר מספר אישי`);
        continue;
      }

      // Check for duplicates in DB
      const existing = await this.prisma.user.findUnique({
        where: { personalId: row.personalId },
      });

      if (existing) {
        errors.push(`שורה ${index + 1}: מספר אישי ${row.personalId} כבר קיים`);
        continue;
      }

      validRows.push(row);
    }

    return { totalRows: result.data.length, validRows, errors };
  }

  async importUsers(rows: CsvRow[]): Promise<{
    successCount: number;
    errors: string[];
  }> {
    let successCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Find department by code
        const department = await this.prisma.department.findUnique({
          where: { code: row.departmentCode },
        });

        if (!department) {
          errors.push(`מחלקה ${row.departmentCode} לא נמצאה`);
          continue;
        }

        // Map CSV role to MilitaryRole enum
        const militaryRole = this.mapRoleFromCsv(row.militaryRole);

        await this.prisma.user.create({
          data: {
            personalId: row.personalId,
            fullName: row.fullName || '',
            militaryRole,
            departmentId: department.id,
            isPreApproved: true,
            isRegistered: false,
            // Temporary values - will be filled during registration
            email: `temp_${row.personalId}@pending.local`,
            phone: '0000000000',
            passwordHash: '',
            idNumber: row.personalId, // Temporary
          },
        });

        successCount++;
      } catch (error) {
        errors.push(`שגיאה בייבוא ${row.personalId}: ${error.message}`);
      }
    }

    return { successCount, errors };
  }

  private mapRoleFromCsv(csvRole: string): MilitaryRole {
    const mapping: Record<string, MilitaryRole> = {
      'מפקד פלוגה': MilitaryRole.PLATOON_COMMANDER,
      'סמ״פ': MilitaryRole.SERGEANT_MAJOR,
      'קמב״צ': MilitaryRole.OPERATIONS_SGT,
      'סמב״צ': MilitaryRole.OPERATIONS_NCO,
      'מ״מ': MilitaryRole.DUTY_OFFICER,
      'מפקד': MilitaryRole.SQUAD_COMMANDER,
      'לוחם': MilitaryRole.FIGHTER,
      'קצין': MilitaryRole.DUTY_OFFICER, // Map to closest equivalent
    };

    return mapping[csvRole] || MilitaryRole.FIGHTER;
  }
}
```

**Controller**:
```typescript
@Controller('csv-import')
export class CsvImportController {
  @Post('preview')
  @Permissions(Permission.IMPORT_USERS_CSV)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: Express.Multer.File) {
    return this.csvService.previewCsv(file.buffer);
  }

  @Post('import')
  @Permissions(Permission.IMPORT_USERS_CSV)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async import(@Body() dto: { rows: CsvRow[] }) {
    return this.csvService.importUsers(dto.rows);
  }
}
```

#### 6. Update Existing Modules for Permissions

**Forms Module** - Add department filtering:
```typescript
// backend/src/modules/forms/forms.service.ts
async findAll(userId: string, userDepartmentId: string, militaryRole: MilitaryRole) {
  const hasViewAllPermission = hasPermission(militaryRole, Permission.VIEW_ALL_REQUESTS);

  return this.prisma.formSubmission.findMany({
    where: hasViewAllPermission
      ? {}
      : {
          user: { departmentId: userDepartmentId },
        },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}
```

**Messages Module** - Add permission checks:
```typescript
@Post()
@Permissions(Permission.MANAGE_MESSAGES)
@UseGuards(JwtAuthGuard, PermissionsGuard)
async create(@Body() dto: CreateMessageDto, @CurrentUser() user) {
  return this.messagesService.create(dto, user.id);
}
```

#### 7. Database Migration

**Create migration**:
```bash
cd backend
npx prisma migrate dev --name auth_redesign
```

**Manual data migration needed**:
```sql
-- Migrate existing users to new structure
-- This is a CRITICAL step that must be done carefully

-- 1. Add personalId from existing armyNumber
UPDATE users
SET "personalId" = "armyNumber",
    "isPreApproved" = true,
    "isRegistered" = true,
    "militaryRole" = 'FIGHTER';  -- Default role

-- 2. Set militaryRole based on existing role
UPDATE users
SET "militaryRole" =
  CASE
    WHEN role = 'ADMIN' THEN 'PLATOON_COMMANDER'
    WHEN role = 'OFFICER' THEN 'DUTY_OFFICER'
    WHEN role = 'COMMANDER' THEN 'SQUAD_COMMANDER'
    ELSE 'FIGHTER'
  END;

-- 3. Create default department
INSERT INTO departments (id, name, code, "isActive")
VALUES (gen_random_uuid(), 'מחלקה ראשונה', '1', true);

-- 4. Assign all users to default department
UPDATE users
SET "departmentId" = (SELECT id FROM departments WHERE code = '1');
```

#### 8. Seed Data

**Create**: `backend/prisma/seed.ts`

```typescript
import { PrismaClient, MilitaryRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create departments
  const dept1 = await prisma.department.upsert({
    where: { code: '1' },
    update: {},
    create: {
      name: 'מחלקה 1',
      code: '1',
      isActive: true,
    },
  });

  const dept2 = await prisma.department.upsert({
    where: { code: '2' },
    update: {},
    create: {
      name: 'מחלקה 2',
      code: '2',
      isActive: true,
    },
  });

  console.log('✅ Created departments');

  // 2. Create skills
  const skills = [
    { name: 'driver', displayName: 'נהג', description: 'רישיון נהיגה' },
    { name: 'medic', displayName: 'חובש', description: 'הכשרה רפואית' },
    { name: 'sfogist', displayName: 'ספוגיסט', description: 'מפעיל ספוג' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }

  console.log('✅ Created skills');

  // 3. Create first commander (MUST BE DONE MANUALLY IN PRODUCTION)
  const passwordHash = await bcrypt.hash('Password123', 10);

  await prisma.user.upsert({
    where: { personalId: '1000000' },
    update: {},
    create: {
      personalId: '1000000',
      fullName: 'מפקד ראשי',
      email: 'commander@yogev.idf',
      phone: '0501234567',
      passwordHash,
      militaryRole: MilitaryRole.PLATOON_COMMANDER,
      departmentId: dept1.id,
      idNumber: '123456789',
      isPreApproved: true,
      isRegistered: true,
      role: 'ADMIN',  // Legacy
      armyNumber: '1000000',  // Legacy
    },
  });

  console.log('✅ Created first commander');
  console.log('   PersonalId: 1000000');
  console.log('   Password: Password123');
  console.log('   ⚠️  CHANGE PASSWORD IMMEDIATELY IN PRODUCTION!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run seed**:
```bash
cd backend
npx prisma db seed
```

**Update package.json**:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

### 🎨 Frontend Implementation

#### 1. Update Types

**File**: `frontend/src/types/index.ts`

Add/Update:
```typescript
// Military Roles
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

// Department
export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

// Updated User
export interface User {
  id: string;
  personalId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole; // Legacy
  militaryRole: MilitaryRole;
  department?: Department;
  departmentId?: string;
  // ... rest of fields
}

// Permissions (for frontend checks)
export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  IMPORT_USERS_CSV = 'IMPORT_USERS_CSV',
  VIEW_ALL_REQUESTS = 'VIEW_ALL_REQUESTS',
  // ... add all permissions from backend
}

// Pre-approved user
export interface PreApprovedUser {
  id: string;
  personalId: string;
  fullName: string;
  militaryRole: MilitaryRole;
  department: Department;
  isRegistered: boolean;
  createdAt: string;
}
```

#### 2. Update Login Page

**File**: `frontend/src/app/auth/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface LoginForm {
  personalId: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);

      if (response.data.success) {
        login(response.data.user, response.data.token);
        toast.success('התחברת בהצלחה!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בהתחברות';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        התחברות
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="מספר אישי"
          placeholder="1234567"
          error={errors.personalId?.message}
          {...register('personalId', {
            required: 'מספר אישי הוא שדה חובה',
          })}
        />

        <Input
          label="סיסמה"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'סיסמה היא שדה חובה',
          })}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          התחבר
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          עדיין לא השלמת הרשמה?{' '}
          <a href="/auth/register" className="text-military-700 font-medium hover:underline">
            השלם הרשמה
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
```

#### 3. Update Register Page (Account Completion)

**File**: `frontend/src/app/auth/register/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { MILITARY_ROLE_LABELS } from '@/types';

interface RegisterForm {
  personalId: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  idNumber: string;
  city?: string;
  dailyJob?: string;
  fieldOfStudy?: string;
  birthDay?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [preApprovedData, setPreApprovedData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');
  const personalId = watch('personalId');

  const handleCheckPersonalId = async () => {
    if (!personalId) {
      toast.error('נא להזין מספר אישי');
      return;
    }

    setIsChecking(true);
    try {
      const response = await api.post('/auth/check-personalid', { personalId });

      if (response.data.success) {
        setPreApprovedData(response.data.user);
        toast.success('מספר אישי אומת! ניתן להמשיך בהשלמת ההרשמה');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'מספר אישי לא נמצא');
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!preApprovedData) {
      toast.error('נא לאמת את המספר האישי תחילה');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', data);

      if (response.data.success) {
        toast.success('ההרשמה הושלמה בהצלחה!');
        router.push('/auth/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'שגיאה בהשלמת ההרשמה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        השלמת הרשמה
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Personal ID Check */}
        <div className="space-y-2">
          <Input
            label="מספר אישי"
            placeholder="1234567"
            required
            disabled={!!preApprovedData}
            error={errors.personalId?.message}
            {...register('personalId', {
              required: 'מספר אישי הוא שדה חובה',
            })}
          />
          {!preApprovedData && (
            <Button
              type="button"
              onClick={handleCheckPersonalId}
              isLoading={isChecking}
              variant="secondary"
              className="w-full"
            >
              אמת מספר אישי
            </Button>
          )}
        </div>

        {preApprovedData && (
          <>
            {/* Read-only system fields */}
            <div className="bg-military-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-military-700">פרטי מערכת (לא ניתן לשינוי)</h3>
              <div>
                <span className="text-sm text-gray-600">תפקיד: </span>
                <span className="font-medium">
                  {MILITARY_ROLE_LABELS[preApprovedData.militaryRole]}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">מחלקה: </span>
                <span className="font-medium">
                  {preApprovedData.department?.name || 'לא משוייך'}
                </span>
              </div>
            </div>

            {/* User-fillable fields */}
            <Input
              label="שם מלא"
              required
              error={errors.fullName?.message}
              {...register('fullName', {
                required: 'שם מלא הוא שדה חובה',
              })}
            />

            <Input
              label="טלפון"
              required
              error={errors.phone?.message}
              {...register('phone', {
                required: 'טלפון הוא שדה חובה',
                pattern: {
                  value: /^05\d{8}$/,
                  message: 'מספר טלפון לא תקין',
                },
              })}
            />

            <Input
              label="אימייל"
              type="email"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'אימייל הוא שדה חובה',
              })}
            />

            <Input
              label="סיסמה"
              type="password"
              required
              error={errors.password?.message}
              {...register('password', {
                required: 'סיסמה היא שדה חובה',
                minLength: {
                  value: 8,
                  message: 'הסיסמה חייבת להכיל לפחות 8 תווים',
                },
              })}
            />

            <Input
              label="אימות סיסמה"
              type="password"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'אימות סיסמה הוא שדה חובה',
                validate: (value) => value === password || 'הסיסמאות לא תואמות',
              })}
            />

            <Input
              label="תעודת זהות"
              required
              error={errors.idNumber?.message}
              {...register('idNumber', {
                required: 'תעודת זהות היא שדה חובה',
                pattern: {
                  value: /^\d{9}$/,
                  message: 'מספר תעודת זהות לא תקין',
                },
              })}
            />

            {/* Optional fields */}
            <Input label="עיר" {...register('city')} />
            <Input label="עבודה אזרחית" {...register('dailyJob')} />
            <Input label="תחום לימודים" {...register('fieldOfStudy')} />
            <Input label="תאריך לידה" type="date" {...register('birthDay')} />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              השלם הרשמה
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
```

#### 4. Admin Pages

**Create**: `frontend/src/app/admin/users/page.tsx`
**Create**: `frontend/src/app/admin/preapproved-users/page.tsx`
**Create**: `frontend/src/app/admin/csv-import/page.tsx`

Implementation pattern similar to existing admin pages, using:
- Permission checks in frontend
- Department filtering for DUTY_OFFICER role
- Military role labels instead of legacy roles

---

## 📋 Summary of All Changes

### Database Schema
1. ✅ New `MilitaryRole` enum (7 roles in Hebrew)
2. ✅ New `Department` model
3. ✅ New `Permission` model
4. ✅ New `RolePermission` model
5. ✅ Extended `User` model with new fields

### Backend API
1. ✅ Removed OTP authentication completely
2. ✅ New personalId-based login
3. ✅ New account-completion registration flow
4. ✅ Permission-based authorization system
5. 🚧 Departments CRUD module (pattern provided)
6. 🚧 CSV import module (full implementation provided)
7. 🚧 Update existing modules with permission checks

### Frontend
1. 🚧 Updated login page (personalId input)
2. 🚧 Updated register page (account completion flow)
3. 🚧 Updated types with MilitaryRole, Department, Permissions
4. 🚧 New admin pages for user management
5. 🚧 CSV import UI

---

## 🚀 Next Steps to Complete Implementation

1. **Create and run migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name auth_redesign
   # Then run manual SQL migration for existing data
   npx prisma db seed
   ```

2. **Create remaining backend modules**:
   - Departments module (copy pattern from this guide)
   - CSV import module (copy full implementation from this guide)

3. **Update existing modules** with permission decorators:
   - Forms module - add department filtering
   - Messages module - add permission checks
   - Zones/Tasks - add permission checks

4. **Frontend updates**:
   - Update types file
   - Update login page
   - Update register page
   - Create admin user management pages
   - Create CSV import page

5. **Testing**:
   - Test registration flow with pre-approved user
   - Test permission checks for each role
   - Test department-scoped access
   - Test CSV import

6. **Production deployment**:
   - Manually create first PLATOON_COMMANDER in production DB
   - Change default password immediately
   - Import initial department commanders
   - Import bulk users via CSV

---

## ⚠️ Critical Migration Notes

1. **Existing data must be migrated carefully** - the SQL migration script provided MUST be reviewed and tested in staging first

2. **First commander bootstrap** - in production, you must manually insert the first commander OUTSIDE the application

3. **Email service** - The old EmailService can be removed or kept for future notification features

4. **Backward compatibility** - `armyNumber` and `role` fields are kept to avoid breaking existing code during gradual migration

---

## 📞 Support

For questions during implementation, refer to:
- This implementation guide
- Prisma schema comments
- Backend permission constants file
- Example implementations provided above
