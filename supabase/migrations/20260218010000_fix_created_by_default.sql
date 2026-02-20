-- =====================================================
-- Fix created_by column defaults for RLS compatibility
-- Migration: 20260218010000_fix_created_by_default
-- =====================================================

-- Add DEFAULT auth.uid() to created_by columns for better RLS compatibility
ALTER TABLE employees 
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE time_entries 
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE change_history 
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE documents 
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE sync_queue 
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Ensure RLS policies are correctly set (redundant but safe)
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employees;
CREATE POLICY "Allow authenticated users to insert employees"
ON employees
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: This allows authenticated users to insert employees without explicitly
-- providing created_by, as it will be automatically set to the current user's ID