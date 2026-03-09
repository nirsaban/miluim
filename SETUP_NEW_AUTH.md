# מערכת יוגב - New Authentication System Setup Guide

## 🚀 Quick Start - Setting Up The New System

This guide will help you set up the new personalId-based authentication system with the סמ״פ admin user.

---

## Step 1: Generate and Run Migration

First, generate the Prisma migration for the new schema:

```bash
cd backend
npx prisma migrate dev --name auth_redesign
```

This will create the migration and apply it to your database.

---

## Step 2: Generate Prisma Client

Generate the new Prisma client with updated types:

```bash
npx prisma generate
```

---

## Step 3: Run the Seed

Run the seed file to create the admin user and initial data:

```bash
npm run prisma:seed
```

You should see output like:

```
🌱 Starting database seed...

📦 Creating departments...
✅ Created department: מחלקה 1
✅ Created department: מחלקה 2
✅ Created department: מחלקה 3

👤 Creating סמ״פ admin user...

✅ סמ״פ Admin user created!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   שם: סמ״פ מערכת
   תפקיד: סמ״פ (Sergeant Major)
   מספר אישי: 9999999
   סיסמה: Yogev2024!
   אימייל: samal@yogev.idf
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT: Change password after first login!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 4: Restart Backend Server

Restart your backend server to load the new code:

```bash
# If using npm run start:dev
npm run start:dev

# Or if using docker
docker-compose restart backend
```

---

## Step 5: Test the New Login

1. **Navigate to the frontend**: `http://localhost:3000/auth/login`

2. **Login with סמ״פ credentials**:
   - **מספר אישי**: `9999999`
   - **סיסמה**: `Yogev2024!`

3. You should be logged in successfully and redirected to the dashboard!

---

## Step 6: Test Account Completion Flow

The seed also created a pre-approved test user that you can use to test the registration flow:

1. **Navigate to**: `http://localhost:3000/auth/register`

2. **Enter personalId**: `1234567`

3. **Click "אמת מספר אישי"**

4. You'll see the user's role (לוחם) and department (מחלקה 1) displayed as read-only

5. **Fill in the registration form**:
   - שם מלא: (any name)
   - טלפון: `0501234567`
   - אימייל: `test@example.com`
   - סיסמה: `Test1234!`
   - אימות סיסמה: `Test1234!`
   - תעודת זהות: `123456789`

6. **Click "השלם הרשמה"**

7. You should be redirected to login page

8. **Login with**:
   - מספר אישי: `1234567`
   - סיסמה: `Test1234!`

---

## What Was Created

### Admin User (סמ״פ)
- **Full Name**: סמ״פ מערכת
- **PersonalId**: `9999999`
- **Password**: `Yogev2024!`
- **Role**: SERGEANT_MAJOR (סמ״פ)
- **Department**: מחלקה 1
- **Permissions**: Full system access

### Departments
- מחלקה 1 (Code: 1)
- מחלקה 2 (Code: 2)
- מחלקה 3 (Code: 3)

### Pre-Approved Test User
- **PersonalId**: `1234567`
- **Role**: FIGHTER (לוחם)
- **Department**: מחלקה 1
- **Status**: Pre-approved, not yet registered
- Can complete registration at `/auth/register`

### Skills
- מפקד (COMMANDER)
- נהג (DRIVER)
- לוחם (FIGHTER)
- ספוגיסט (SFOGIST)
- חובש (MEDIC)
- קשר (RADIO)
- נווט (NAVIGATOR)

### Shift Templates
- בוקר (06:00-14:00)
- ערב (14:00-22:00)
- לילה (22:00-06:00)

---

## Frontend Changes Summary

### Login Page (`/auth/login`)
- ✅ Changed from email to **מספר אישי** (personalId)
- ✅ Updated text from "הרשמה" to "השלם הרשמה"
- ✅ Removed OTP flow completely

### Register Page (`/auth/register`)
- ✅ Now titled "השלמת הרשמה למערכת" (Account Completion)
- ✅ Added personalId check step
- ✅ Shows read-only military role and department
- ✅ User can only fill personal details
- ✅ Cannot self-assign role or department

### Types (`frontend/src/types/index.ts`)
- ✅ Added `MilitaryRole` type
- ✅ Added `MILITARY_ROLE_LABELS` constants
- ✅ Added `Department` interface
- ✅ Extended `User` interface with new fields

---

## Backend Changes Summary

### Schema (`backend/prisma/schema.prisma`)
- ✅ Added `MilitaryRole` enum
- ✅ Added `Department` model
- ✅ Added `Permission` and `RolePermission` models
- ✅ Extended `User` model with personalId, militaryRole, departmentId, etc.

### Auth Service (`backend/src/modules/auth/auth.service.ts`)
- ✅ Removed OTP authentication
- ✅ Added `checkPersonalId()` method
- ✅ Updated `register()` for account completion
- ✅ Updated `login()` to use personalId

### Permissions System
- ✅ Created permission constants
- ✅ Created `@Permissions()` decorator
- ✅ Created `PermissionsGuard`

---

## Troubleshooting

### Error: "Module not found: Can't resolve '@prisma/client'"

Run:
```bash
cd backend
npx prisma generate
```

### Error: "Column 'personalId' does not exist"

Run the migration:
```bash
cd backend
npx prisma migrate dev --name auth_redesign
```

### Error: "Cannot find module 'MilitaryRole'"

The Prisma client wasn't regenerated. Run:
```bash
cd backend
npx prisma generate
```

Then restart the backend server.

### Frontend shows old login page

Clear your browser cache or hard refresh (Ctrl+Shift+R / Cmd+Shift+R).

---

## Security Notes

⚠️ **IMPORTANT**: The default admin password `Yogev2024!` should be changed immediately after first login in production!

⚠️ **Pre-approved users**: Remember that users can only register if they have been pre-created in the database with `isPreApproved = true`.

---

## Next Steps

1. ✅ Login with the סמ״פ admin account
2. Create additional users via admin panel (when implemented)
3. Or manually create pre-approved users in the database
4. Implement CSV import for bulk user creation (see `REDESIGN_IMPLEMENTATION_GUIDE.md`)

---

## Need Help?

- See `REDESIGN_SUMMARY.md` for complete overview
- See `REDESIGN_IMPLEMENTATION_GUIDE.md` for detailed implementation patterns
- Check backend logs for detailed error messages

---

**Last Updated**: 2026-03-09
**Status**: ✅ Ready to Use
