-- ============================================================
-- MANUAL DATA MIGRATION FOR AUTH REDESIGN
-- ============================================================
-- ⚠️  CRITICAL: Test this in staging environment first!
-- ⚠️  Backup your database before running!
-- ============================================================

-- Step 1: Create default department if doesn't exist
INSERT INTO departments (id, name, code, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'מחלקה ראשונה',
  '1',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM departments WHERE code = '1'
);

-- Step 2: Migrate existing users to new structure
-- Set personalId from armyNumber
UPDATE users
SET "personalId" = "armyNumber"
WHERE "personalId" IS NULL;

-- Set registration flags for existing users
UPDATE users
SET
  "isPreApproved" = true,
  "isRegistered" = true
WHERE "isPreApproved" IS NULL OR "isRegistered" IS NULL;

-- Step 3: Set military roles based on legacy roles
UPDATE users
SET "militaryRole" =
  CASE
    WHEN role = 'ADMIN' THEN 'PLATOON_COMMANDER'::military_role
    WHEN role = 'OFFICER' THEN 'DUTY_OFFICER'::military_role
    WHEN role = 'COMMANDER' THEN 'SQUAD_COMMANDER'::military_role
    WHEN role = 'MEDIC' THEN 'FIGHTER'::military_role
    WHEN role = 'LOGISTICS' THEN 'FIGHTER'::military_role
    WHEN role = 'SFOGIST' THEN 'FIGHTER'::military_role
    ELSE 'FIGHTER'::military_role
  END
WHERE "militaryRole" IS NULL;

-- Step 4: Assign all users to default department
UPDATE users
SET "departmentId" = (SELECT id FROM departments WHERE code = '1')
WHERE "departmentId" IS NULL;

-- Step 5: Clean up old OTP records (optional)
-- Uncomment if you want to remove old OTP data
-- DELETE FROM otps WHERE "createdAt" < NOW() - INTERVAL '30 days';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the migration was successful:

-- Check all users have personalId
SELECT COUNT(*) as users_without_personalid
FROM users
WHERE "personalId" IS NULL OR "personalId" = '';

-- Check all users have militaryRole
SELECT COUNT(*) as users_without_military_role
FROM users
WHERE "militaryRole" IS NULL;

-- Check all users have department
SELECT COUNT(*) as users_without_department
FROM users
WHERE "departmentId" IS NULL;

-- Check distribution of military roles
SELECT "militaryRole", COUNT(*) as count
FROM users
GROUP BY "militaryRole"
ORDER BY count DESC;

-- Check registration status
SELECT
  COUNT(CASE WHEN "isPreApproved" = true THEN 1 END) as preapproved_count,
  COUNT(CASE WHEN "isRegistered" = true THEN 1 END) as registered_count,
  COUNT(*) as total_users
FROM users;
