-- =====================================================
-- Fix RLS Policies - Allow anon access
-- Migration: 20260218020000_fix_rls_anon_access
-- 
-- Problem: Aplikacja nie ma jeszcze logowania użytkowników,
-- więc zapytania trafiają jako rola 'anon', a nie 'authenticated'.
-- Polityki RLS były ustawione tylko dla 'authenticated',
-- co blokowało wszystkie operacje INSERT/UPDATE/DELETE.
-- =====================================================

-- =====================================================
-- EMPLOYEES - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Allow anon to select employees" ON employees;
CREATE POLICY "Allow anon to select employees"
ON employees
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon to insert employees" ON employees;
CREATE POLICY "Allow anon to insert employees"
ON employees
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update employees" ON employees;
CREATE POLICY "Allow anon to update employees"
ON employees
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to delete employees" ON employees;
CREATE POLICY "Allow anon to delete employees"
ON employees
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- TIME_ENTRIES - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Allow anon to select time_entries" ON time_entries;
CREATE POLICY "Allow anon to select time_entries"
ON time_entries
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon to insert time_entries" ON time_entries;
CREATE POLICY "Allow anon to insert time_entries"
ON time_entries
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update time_entries" ON time_entries;
CREATE POLICY "Allow anon to update time_entries"
ON time_entries
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to delete time_entries" ON time_entries;
CREATE POLICY "Allow anon to delete time_entries"
ON time_entries
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- CHANGE_HISTORY - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Allow anon to select change_history" ON change_history;
CREATE POLICY "Allow anon to select change_history"
ON change_history
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon to insert change_history" ON change_history;
CREATE POLICY "Allow anon to insert change_history"
ON change_history
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- DOCUMENTS - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Allow anon to select documents" ON documents;
CREATE POLICY "Allow anon to select documents"
ON documents
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon to insert documents" ON documents;
CREATE POLICY "Allow anon to insert documents"
ON documents
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update documents" ON documents;
CREATE POLICY "Allow anon to update documents"
ON documents
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to delete documents" ON documents;
CREATE POLICY "Allow anon to delete documents"
ON documents
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- SYNC_QUEUE - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Allow anon to select sync_queue" ON sync_queue;
CREATE POLICY "Allow anon to select sync_queue"
ON sync_queue
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon to insert sync_queue" ON sync_queue;
CREATE POLICY "Allow anon to insert sync_queue"
ON sync_queue
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update sync_queue" ON sync_queue;
CREATE POLICY "Allow anon to update sync_queue"
ON sync_queue
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to delete sync_queue" ON sync_queue;
CREATE POLICY "Allow anon to delete sync_queue"
ON sync_queue
FOR DELETE
TO anon
USING (true);

-- =====================================================
-- Usuń DEFAULT auth.uid() z created_by (nie działa dla anon)
-- =====================================================
ALTER TABLE employees ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE time_entries ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE change_history ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE documents ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE sync_queue ALTER COLUMN created_by DROP DEFAULT;
