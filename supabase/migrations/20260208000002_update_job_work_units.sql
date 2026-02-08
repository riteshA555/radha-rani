-- Drop the old constraint
ALTER TABLE job_work_items DROP CONSTRAINT IF EXISTS job_work_items_unit_check;

-- Add the expanded constraint
ALTER TABLE job_work_items ADD CONSTRAINT job_work_items_unit_check 
CHECK (unit = ANY (ARRAY['KG', 'GRAMS', 'PCS', 'SET', 'JODI', 'FIXED']));
