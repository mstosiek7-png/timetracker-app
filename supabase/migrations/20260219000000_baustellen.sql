-- =====================================================
-- TimeTracker - Baustellen Module Database Schema
-- Migration: 20260219000000_baustellen
-- =====================================================

-- =====================================================
-- TABLE: construction_sites
-- Przechowuje dane budów/placów budowy
-- =====================================================
CREATE TABLE IF NOT EXISTS construction_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  
  CONSTRAINT construction_sites_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_construction_sites_status ON construction_sites(status);
CREATE INDEX IF NOT EXISTS idx_construction_sites_created_at ON construction_sites(created_at DESC);

-- =====================================================
-- TABLE: asphalt_types
-- Typy asfaltu dla poszczególnych budów
-- =====================================================
CREATE TABLE IF NOT EXISTS asphalt_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT asphalt_types_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT unique_asphalt_type_per_site UNIQUE(site_id, name)
);

CREATE INDEX IF NOT EXISTS idx_asphalt_types_site ON asphalt_types(site_id);
CREATE INDEX IF NOT EXISTS idx_asphalt_types_name ON asphalt_types(name);

-- =====================================================
-- TABLE: deliveries
-- Dostawy asfaltu na budowy
-- =====================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES construction_sites(id) ON DELETE CASCADE,
  asphalt_type_id UUID REFERENCES asphalt_types(id),
  tons DECIMAL(8,2) NOT NULL CHECK (tons > 0),
  lieferschein_nr TEXT,
  supplier TEXT,
  delivery_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT deliveries_tons_positive CHECK (tons > 0)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_site ON deliveries(site_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_asphalt_type ON deliveries(asphalt_type_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_time ON deliveries(delivery_time DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_lieferschein ON deliveries(lieferschein_nr);
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier ON deliveries(supplier);

-- =====================================================
-- TRIGGERS - Updated_at automation
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS construction_sites_updated_at ON construction_sites;
CREATE TRIGGER construction_sites_updated_at
  BEFORE UPDATE ON construction_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS asphalt_types_updated_at ON asphalt_types;
CREATE TRIGGER asphalt_types_updated_at
  BEFORE UPDATE ON asphalt_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS deliveries_updated_at ON deliveries;
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE construction_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE asphalt_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: construction_sites - authenticated users can SELECT, INSERT, UPDATE
-- Anonimowi użytkownicy mogą tylko INSERT z created_by = NULL
DROP POLICY IF EXISTS "Enable select for authenticated users" ON construction_sites;
CREATE POLICY "Enable select for authenticated users" ON construction_sites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users" ON construction_sites;
CREATE POLICY "Enable insert for anon users" ON construction_sites
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON construction_sites;
CREATE POLICY "Enable insert for authenticated users" ON construction_sites
  FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Enable update for authenticated users" ON construction_sites;
CREATE POLICY "Enable update for authenticated users" ON construction_sites
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy: asphalt_types - authenticated users can SELECT, INSERT, DELETE
-- Anonimowi użytkownicy mogą tylko INSERT
DROP POLICY IF EXISTS "Enable select for authenticated users" ON asphalt_types;
CREATE POLICY "Enable select for authenticated users" ON asphalt_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users" ON asphalt_types;
CREATE POLICY "Enable insert for anon users" ON asphalt_types
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON asphalt_types;
CREATE POLICY "Enable insert for authenticated users" ON asphalt_types
  FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON asphalt_types;
CREATE POLICY "Enable delete for authenticated users" ON asphalt_types
  FOR DELETE TO authenticated USING (true);

-- Policy: deliveries - authenticated users can SELECT, INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Enable select for authenticated users" ON deliveries;
CREATE POLICY "Enable select for authenticated users" ON deliveries
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users" ON deliveries;
CREATE POLICY "Enable insert for anon users" ON deliveries
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON deliveries;
CREATE POLICY "Enable insert for authenticated users" ON deliveries
  FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Enable update for authenticated users" ON deliveries;
CREATE POLICY "Enable update for authenticated users" ON deliveries
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON deliveries;
CREATE POLICY "Enable delete for authenticated users" ON deliveries
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STORAGE BUCKET: delivery-photos
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-photos',
  'delivery-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for delivery-photos bucket
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'delivery-photos');

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'delivery-photos');

-- =====================================================
-- FUNCTIONS - Przydatne funkcje
-- =====================================================

-- Pobierz podsumowanie dla budowy (asphalt types z liczbą dostaw i sumą ton)
CREATE OR REPLACE FUNCTION get_site_summary(p_site_id UUID)
RETURNS TABLE (
  asphalt_type_name TEXT,
  delivery_count BIGINT,
  total_tons DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    at.name,
    COUNT(d.id),
    COALESCE(SUM(d.tons), 0)
  FROM asphalt_types at
  LEFT JOIN deliveries d ON d.asphalt_type_id = at.id
    AND d.site_id = p_site_id
  WHERE at.site_id = p_site_id
  GROUP BY at.id, at.name
  ORDER BY at.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Pobierz szczegółowe statystyki budowy (łączne tony, liczba dostaw, ostatnia dostawa)
CREATE OR REPLACE FUNCTION get_site_statistics_detail(p_site_id UUID)
RETURNS TABLE (
  total_tons DECIMAL,
  delivery_count BIGINT,
  asphalt_type_count BIGINT,
  last_delivery_date TIMESTAMP WITH TIME ZONE,
  last_delivery_tons DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(d.tons), 0) as total_tons,
    COUNT(d.id) as delivery_count,
    COUNT(DISTINCT at.id) as asphalt_type_count,
    MAX(d.delivery_time) as last_delivery_date,
    (SELECT tons FROM deliveries WHERE site_id = p_site_id ORDER BY delivery_time DESC LIMIT 1) as last_delivery_tons
  FROM construction_sites cs
  LEFT JOIN asphalt_types at ON at.site_id = cs.id
  LEFT JOIN deliveries d ON d.site_id = cs.id
  WHERE cs.id = p_site_id
  GROUP BY cs.id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Pobierz globalne statystyki (wszystkie aktywne budowy)
CREATE OR REPLACE FUNCTION get_site_statistics()
RETURNS TABLE (
  active_count BIGINT,
  total_tons DECIMAL,
  total_deliveries BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cs.id) as active_count,
    COALESCE(SUM(d.tons), 0) as total_tons,
    COUNT(d.id) as total_deliveries
  FROM construction_sites cs
  LEFT JOIN deliveries d ON d.site_id = cs.id
  WHERE cs.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Pobierz wszystkie dostawy dla budowy z danymi typu asfaltu
CREATE OR REPLACE FUNCTION get_site_deliveries(p_site_id UUID)
RETURNS TABLE (
  delivery_id UUID,
  asphalt_type_name TEXT,
  tons DECIMAL,
  lieferschein_nr TEXT,
  supplier TEXT,
  delivery_time TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    at.name,
    d.tons,
    d.lieferschein_nr,
    d.supplier,
    d.delivery_time,
    d.photo_url,
    d.created_at
  FROM deliveries d
  LEFT JOIN asphalt_types at ON at.id = d.asphalt_type_id
  WHERE d.site_id = p_site_id
  ORDER BY d.delivery_time DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- VIEWS - Przydatne widoki
-- =====================================================

-- Widok aktywnych budów z podsumowaniem dostaw
CREATE OR REPLACE VIEW v_active_sites_summary AS
SELECT
  cs.id,
  cs.name,
  cs.address,
  cs.status,
  cs.created_at,
  COUNT(DISTINCT at.id) as asphalt_types_count,
  COUNT(d.id) as deliveries_count,
  COALESCE(SUM(d.tons), 0) as total_tons,
  MAX(d.delivery_time) as last_delivery_date
FROM construction_sites cs
LEFT JOIN asphalt_types at ON at.site_id = cs.id
LEFT JOIN deliveries d ON d.site_id = cs.id
WHERE cs.status = 'active'
GROUP BY cs.id, cs.name, cs.address, cs.status, cs.created_at
ORDER BY cs.created_at DESC;

-- Widok dostaw z pełnymi danymi
CREATE OR REPLACE VIEW v_deliveries_full AS
SELECT
  d.id,
  d.site_id,
  cs.name as site_name,
  d.asphalt_type_id,
  at.name as asphalt_type_name,
  d.tons,
  d.lieferschein_nr,
  d.supplier,
  d.delivery_time,
  d.photo_url,
  d.created_at,
  d.updated_at,
  d.created_by
FROM deliveries d
JOIN construction_sites cs ON cs.id = d.site_id
LEFT JOIN asphalt_types at ON at.id = d.asphalt_type_id
ORDER BY d.delivery_time DESC;

-- =====================================================
-- AUDIT TRIGGERS - Automatyczne logowanie zmian
-- =====================================================

-- Trigger dla construction_sites
CREATE OR REPLACE FUNCTION log_construction_site_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO change_history (
    action,
    entity_type,
    entity_id,
    description,
    old_value,
    new_value,
    created_by,
    user_email
  ) VALUES (
    TG_OP,
    'construction_sites',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'New construction site created: ' || NEW.name
      WHEN 'UPDATE' THEN 'Construction site updated: ' || NEW.name
      WHEN 'DELETE' THEN 'Construction site deleted: ' || OLD.name
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS construction_sites_change_log ON construction_sites;
CREATE TRIGGER construction_sites_change_log
  AFTER INSERT OR UPDATE OR DELETE ON construction_sites
  FOR EACH ROW EXECUTE FUNCTION log_construction_site_changes();

-- Trigger dla deliveries
CREATE OR REPLACE FUNCTION log_delivery_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO change_history (
    action,
    entity_type,
    entity_id,
    description,
    old_value,
    new_value,
    created_by,
    user_email
  ) VALUES (
    TG_OP,
    'deliveries',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'New delivery added: ' || COALESCE(NEW.tons::text, '') || ' tons'
      WHEN 'UPDATE' THEN 'Delivery updated: ' || COALESCE(NEW.tons::text, '') || ' tons'
      WHEN 'DELETE' THEN 'Delivery deleted: ' || COALESCE(OLD.tons::text, '') || ' tons'
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_change_log ON deliveries;
CREATE TRIGGER deliveries_change_log
  AFTER INSERT OR UPDATE OR DELETE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION log_delivery_changes();

-- =====================================================
-- COMMENTS - Opisy tabel i kolumn
-- =====================================================
COMMENT ON TABLE construction_sites IS 'Budowy/place budowy - główna tabela modułu Baustellen';
COMMENT ON COLUMN construction_sites.name IS 'Nazwa budowy (np. "Autostrada A2 - odcinek Warszawa-Łódź")';
COMMENT ON COLUMN construction_sites.status IS 'Status budowy: active (aktywna), completed (zakończona)';

COMMENT ON TABLE asphalt_types IS 'Typy asfaltu dostępne na danej budowie';
COMMENT ON COLUMN asphalt_types.name IS 'Nazwa typu asfaltu (np. "AC 11 D S", "SMA 11 S")';

COMMENT ON TABLE deliveries IS 'Dostawy asfaltu na budowy';
COMMENT ON COLUMN deliveries.tons IS 'Ilość asfaltu w tonach (precyzja 2 miejsca po przecinku)';
COMMENT ON COLUMN deliveries.lieferschein_nr IS 'Numer listu przewozowego/dokumentu dostawy';
COMMENT ON COLUMN deliveries.photo_url IS 'URL do zdjęcia dokumentu dostawy (przechowywane w bucket delivery-photos)';

COMMENT ON FUNCTION get_site_summary IS 'Zwraca podsumowanie dla budowy: typy asfaltu z liczbą dostaw i sumą ton';
COMMENT ON FUNCTION get_site_statistics IS 'Zwraca globalne statystyki: liczba aktywnych budów, łączne tony, liczba wszystkich dostaw';
COMMENT ON FUNCTION get_site_statistics_detail IS 'Zwraca szczegółowe statystyki budowy: łączne tony, liczba dostaw, typy asfaltu, ostatnia dostawa';
COMMENT ON FUNCTION get_site_deliveries IS 'Zwraca wszystkie dostawy dla budowy z pełnymi danymi';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================