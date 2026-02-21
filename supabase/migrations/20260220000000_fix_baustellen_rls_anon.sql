-- =====================================================
-- Fix RLS Policies for Baustellen - Allow anon access
-- Migration: 20260220000000_fix_baustellen_rls_anon
-- 
-- Problem: Tabele z modułu Baustellen (construction_sites, asphalt_types, deliveries)
-- miały polityki RLS tylko dla (authenticated), a aplikacja mobilna używa (anon) klucza.
-- To blokowało wszystkie operacje INSERT/UPDATE/DELETE.
-- =====================================================

-- =====================================================
-- CONSTRUCTION_SITES - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Enable select for anon users" ON construction_sites;
CREATE POLICY "Enable select for anon users" ON construction_sites
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Enable insert for anon" ON construction_sites;
CREATE POLICY "Enable insert for anon" ON construction_sites
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable update for anon" ON construction_sites;
CREATE POLICY "Enable update for anon" ON construction_sites
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for anon" ON construction_sites;
CREATE POLICY "Enable delete for anon" ON construction_sites
  FOR DELETE TO anon USING (true);

-- =====================================================
-- ASPHALT_TYPES - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Enable select for anon users" ON asphalt_types;
CREATE POLICY "Enable select for anon users" ON asphalt_types
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Enable insert for anon" ON asphalt_types;
CREATE POLICY "Enable insert for anon" ON asphalt_types
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable delete for anon" ON asphalt_types;
CREATE POLICY "Enable delete for anon" ON asphalt_types
  FOR DELETE TO anon USING (true);

-- =====================================================
-- DELIVERIES - polityki dla anon
-- =====================================================
DROP POLICY IF EXISTS "Enable select for anon users" ON deliveries;
CREATE POLICY "Enable select for anon users" ON deliveries
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Enable insert for anon" ON deliveries;
CREATE POLICY "Enable insert for anon" ON deliveries
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anon" ON deliveries;
CREATE POLICY "Enable update for anon" ON deliveries
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for anon" ON deliveries;
CREATE POLICY "Enable delete for anon" ON deliveries
  FOR DELETE TO anon USING (true);

-- =====================================================
-- RPC FUNCTIONS - Grant permissions to anon role
-- =====================================================
GRANT EXECUTE ON FUNCTION get_site_summary(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_site_statistics() TO anon;
GRANT EXECUTE ON FUNCTION get_site_statistics_detail(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_site_deliveries(UUID) TO anon;
