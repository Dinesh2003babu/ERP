-- 🏗️ 1. CREATE MASTER TABLE FOR ENGINEERS
CREATE TABLE IF NOT EXISTS engineers (
  engineer_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  pay_rate NUMERIC DEFAULT 0,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  contact_no TEXT,
  aadhaar_no TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (location, type) REFERENCES sites(location, type)
);

-- 🛠️ 2. REMOVE STRICT FOREIGN KEY CONSTRAINTS (FOR PROMOTIONS)
-- This allows attendance/salary records to exist for both Labour and Engineers.
BEGIN;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_no_fkey;
ALTER TABLE salary_records DROP CONSTRAINT IF EXISTS salary_records_employee_no_fkey;
ALTER TABLE advances DROP CONSTRAINT IF EXISTS advances_employee_no_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_employee_no_fkey;
COMMIT;

-- 👤 3. MOVE STAFF (Example: Moving staff)
-- Add engineers_no to profiles if it's missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS engineer_no TEXT REFERENCES engineers(engineer_no);

/*
BEGIN;
-- Copy their data across
INSERT INTO engineers (engineer_no, name, category, pay_rate, location, type, contact_no, aadhaar_no)
SELECT employee_no, name, 'Site Engineer', 25000, location, type, contact_no, aadhaar_no
FROM employees 
WHERE employee_no = 'PSE102';

-- Update the login profile
UPDATE profiles SET engineer_no = 'PSE102' WHERE employee_id = 'PSE102';

-- Delete the old Labour record
DELETE FROM employees WHERE employee_no = 'PSE102';
COMMIT;
*/
