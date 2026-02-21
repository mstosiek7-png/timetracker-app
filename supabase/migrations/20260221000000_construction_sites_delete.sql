-- =====================================================
-- Add DELETE policy for construction_sites (authenticated)
-- Migration: 20260221000000_construction_sites_delete
-- =====================================================

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON construction_sites;
CREATE POLICY "Enable delete for authenticated users" ON construction_sites
  FOR DELETE TO authenticated USING (true);
