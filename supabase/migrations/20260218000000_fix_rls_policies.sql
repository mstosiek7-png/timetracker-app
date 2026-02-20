-- =====================================================
-- Fix RLS Policies for Employees Table
-- Migration: 20260218000000_fix_rls_policies
-- =====================================================

-- Drop existing generic policy and create specific policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON employees;

-- Create separate policies for each operation
CREATE POLICY "Allow authenticated users to select employees"
ON employees
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert employees"
ON employees
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update employees"
ON employees
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete employees"
ON employees
FOR DELETE
TO authenticated
USING (true);

-- Also ensure time_entries has proper policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON time_entries;

CREATE POLICY "Allow authenticated users to select time_entries"
ON time_entries
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert time_entries"
ON time_entries
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update time_entries"
ON time_entries
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete time_entries"
ON time_entries
FOR DELETE
TO authenticated
USING (true);