-- ============================================================
-- TEST ATTENDANCE DATA: March 1 - 28, 2026
-- Inserts attendance for all active employees, per site/type
-- ~80% present, ~20% random absences
-- Past days (Mar 1-25) = 'approved', recent (Mar 26-28) = 'pending'
-- ============================================================

-- Step 0: Expand the status check constraint to include 'approved'
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('pending', 'confirmed', 'approved'));

-- Step 1: Clear existing March 2026 attendance
DELETE FROM attendance
WHERE date >= '2026-03-01' AND date <= '2026-03-28';

-- Step 2: Insert attendance using a DO block with random logic
DO $$
DECLARE
  emp RECORD;
  d DATE;
  rnd FLOAT;
  ot_val INT;
  att_status TEXT;
BEGIN
  -- Loop over every active employee
  FOR emp IN
    SELECT employee_no, location, type FROM employees WHERE status = 'active'
  LOOP
    -- Loop over each day March 1 to 28
    FOR d IN SELECT generate_series('2026-03-01'::date, '2026-03-28'::date, '1 day'::interval)::date
    LOOP
      rnd := random();
      -- ~80% present, ~20% absent
      -- OT: 30% chance of 1h OT, 15% chance of 2h, rest = 0
      IF rnd > 0.20 THEN
        -- Present
        ot_val := CASE
          WHEN random() < 0.15 THEN 2
          WHEN random() < 0.30 THEN 1
          ELSE 0
        END;
      ELSE
        -- Absent — no OT
        ot_val := 0;
      END IF;

      -- Status: approved for Mar 1-25, pending for Mar 26-28
      IF d <= '2026-03-25' THEN
        att_status := 'approved';
      ELSE
        att_status := 'pending';
      END IF;

      INSERT INTO attendance (employee_no, location, type, date, is_present, ot_hours, status)
      VALUES (
        emp.employee_no,
        emp.location,
        emp.type,
        d,
        (rnd > 0.20),
        ot_val,
        att_status
      );
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Verify — count records per status
SELECT status, COUNT(*) as count FROM attendance
WHERE date >= '2026-03-01' AND date <= '2026-03-28'
GROUP BY status;
