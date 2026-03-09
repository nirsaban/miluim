# Bootstrap Admin Login Credentials

## Bootstrap Admin (Day 1)

The system starts with ONE admin user who creates all other users:

| Field | Value |
|-------|-------|
| **Personal ID** | `1000000` |
    | **Password** | `Yogev2024!` |
| **Name** | סמ״פ מערכת |
| **Role** | SERGEANT_MAJOR (סמ״פ) |
| **Department** | מחלקה 1 |

---

## How to Use

### Step 1: Login as Admin
1. Go to: `http://localhost:3000/auth/login`
2. Enter **מספר אישי**: `1000000`
3. Enter **סיסמה**: `Yogev2024!`
4. Click login

### Step 2: Create Officers & Soldiers
1. Go to: `http://localhost:3000/admin/preapproved-users`
2. Click "משתמש חדש"
3. Fill in:
   - מספר אישי (Personal ID)
   - שם מלא (Full Name)
   - תפקיד צבאי (Military Role)
   - מחלקה (Department)
4. Click "הוסף משתמש"

### Step 3: Users Complete Registration
1. Users go to: `http://localhost:3000/auth/register`
2. Enter their **מספר אישי** (pre-approved by admin)
3. Complete the registration form
4. Login with their new credentials

---

## Military Role Hierarchy

| Role | Hebrew | Permissions |
|------|--------|-------------|
| PLATOON_COMMANDER | מפקד פלוגה | Full Admin |
| SERGEANT_MAJOR | סמ״פ | Full Admin |
| OPERATIONS_SGT | קמב״צ | Full Admin |
| OPERATIONS_NCO | סמב״צ | Officer Level |
| DUTY_OFFICER | מ״מ | Officer Level |
| SQUAD_COMMANDER | מפקד | Commander Level |
| FIGHTER | לוחם | Basic Soldier |

---

## Departments

- מחלקה 1 (Code: 1)
- מחלקה 2 (Code: 2)
- מחלקה 3 (Code: 3)

---

**Created**: 2026-03-09
**Password**: Yogev2024! (Change after first login in production!)
