-- ============================================================
-- 🏗️ CIVIL ERP - DATABASE CONSTRAINTS & MISSING COLUMNS FIX
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: ADD MISSING COLUMN - marked_by in attendance
-- This links attendance submissions to the engineer who marked them
-- ============================================================
ALTER TABLE attendance 
  ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 2: BACKFILL marked_by for existing records
-- Tries to match attendance location+type to a profile's location+type
-- This is a best-effort update for old records
-- ============================================================
UPDATE attendance a
SET marked_by = p.id
FROM profiles p
WHERE a.marked_by IS NULL
  AND a.location = p.location
  AND a.type = p.type
  AND p.role = 'engineer';

-- ============================================================
-- STEP 3: UPDATE SITES STATUS CONSTRAINT
-- Allows 'inactive' as a valid project status
-- ============================================================
ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_status_check;
ALTER TABLE sites ADD CONSTRAINT sites_status_check CHECK (status IN ('active', 'completed', 'inactive'));

-- ============================================================
-- STEP 4: ENSURE engineers table is properly linked to sites
-- ============================================================
-- engineers.location + engineers.type → sites(location, type)
-- Already in migration script, but confirming here
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'engineers' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'engineers_location_type_fkey'
  ) THEN
    ALTER TABLE engineers
      ADD CONSTRAINT engineers_location_type_fkey 
      FOREIGN KEY (location, type) REFERENCES sites(location, type);
  END IF;
END $$;

-- ============================================================
-- STEP 4: ENSURE profiles.engineer_no → engineers(engineer_no)
-- Links a login account to a Site Engineer record
-- ============================================================
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS engineer_no TEXT REFERENCES engineers(engineer_no) ON DELETE SET NULL;

-- ============================================================
-- STEP 5: ENSURE employees table has required columns
-- ============================================================
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS contact_no TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_no TEXT,
  ADD COLUMN IF NOT EXISTS pay_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================================
-- STEP 6: ENSURE attendance table has all required columns
-- ============================================================
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS ot_hours NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ============================================================
-- STEP 7: CREATE INDEX for common queries (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_location_type ON attendance(location, type);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);

-- ============================================================
-- ✅ VERIFICATION QUERIES - Run these to confirm everything worked
-- ============================================================

-- Check attendance columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- Check all foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('attendance', 'employees', 'engineers', 'profiles', 'sites', 'salary_records', 'advances')
ORDER BY tc.table_name;
