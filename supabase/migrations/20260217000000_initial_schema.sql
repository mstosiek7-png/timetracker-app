-- =====================================================
-- TimeTracker - Initial Database Schema
-- Migration: 20260217000000_initial_schema
-- =====================================================

-- Enable UUID extension for PostgreSQL < 13
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- Set timezone
ALTER DATABASE postgres SET timezone TO 'Europe/Warsaw';

-- =====================================================
-- TABLE: employees
-- Przechowuje dane pracowników
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT employees_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- =====================================================
-- TABLE: time_entries
-- Rejestr czasu pracy
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  status VARCHAR(20) NOT NULL CHECK (status IN ('work', 'sick', 'vacation', 'fza')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_employee_date UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_date_range ON time_entries(employee_id, date);

-- =====================================================
-- TABLE: change_history
-- Historia wszystkich zmian (audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  user_email VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_change_history_created_at ON change_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_employee ON change_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_change_history_entity ON change_history(entity_type, entity_id);

-- =====================================================
-- TABLE: documents
-- Zeskanowane dokumenty dostaw
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  ocr_text TEXT,
  ocr_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  project_id UUID,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);

-- =====================================================
-- TABLE: sync_queue
-- Kolejka synchronizacji dla offline mode
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);

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

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS time_entries_updated_at ON time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Każdy zalogowany użytkownik ma pełny dostęp
DROP POLICY IF EXISTS "Enable all for authenticated users" ON employees;
CREATE POLICY "Enable all for authenticated users" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON time_entries;
CREATE POLICY "Enable all for authenticated users" ON time_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for authenticated users" ON change_history;
CREATE POLICY "Enable read for authenticated users" ON change_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON documents;
CREATE POLICY "Enable all for authenticated users" ON documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON sync_queue;
CREATE POLICY "Enable all for authenticated users" ON sync_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- VIEWS - Przydatne widoki
-- =====================================================

-- Miesięczne podsumowanie dla pracownika
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  e.position,
  DATE_TRUNC('month', te.date) as month,
  te.status,
  SUM(te.hours) as total_hours,
  COUNT(*) as days_count
FROM employees e
LEFT JOIN time_entries te ON e.id = te.employee_id
WHERE e.active = true
GROUP BY e.id, e.name, e.position, DATE_TRUNC('month', te.date), te.status
ORDER BY month DESC, e.name;

-- Dzienne podsumowanie wszystkich pracowników
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
  te.date,
  COUNT(DISTINCT te.employee_id) as employees_count,
  SUM(CASE WHEN te.status = 'work' THEN te.hours ELSE 0 END) as work_hours,
  SUM(CASE WHEN te.status = 'sick' THEN te.hours ELSE 0 END) as sick_hours,
  SUM(CASE WHEN te.status = 'vacation' THEN te.hours ELSE 0 END) as vacation_hours,
  SUM(CASE WHEN te.status = 'fza' THEN te.hours ELSE 0 END) as fza_hours,
  SUM(te.hours) as total_hours
FROM time_entries te
GROUP BY te.date
ORDER BY te.date DESC;

-- =====================================================
-- FUNCTIONS - Przydatne funkcje
-- =====================================================

-- Pobierz miesięczne podsumowanie dla pracownika
CREATE OR REPLACE FUNCTION get_employee_month_summary(
  p_employee_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  date DATE,
  hours DECIMAL,
  status VARCHAR,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.date,
    te.hours,
    te.status,
    te.notes
  FROM time_entries te
  WHERE te.employee_id = p_employee_id
    AND EXTRACT(YEAR FROM te.date) = p_year
    AND EXTRACT(MONTH FROM te.date) = p_month
  ORDER BY te.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk insert godzin dla wielu pracowników
CREATE OR REPLACE FUNCTION bulk_add_hours(
  p_employee_ids UUID[],
  p_date DATE,
  p_hours DECIMAL,
  p_status VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_emp_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_emp_id IN ARRAY p_employee_ids
  LOOP
    INSERT INTO time_entries (employee_id, date, hours, status, created_by)
    VALUES (v_emp_id, p_date, p_hours, p_status, auth.uid())
    ON CONFLICT (employee_id, date) 
    DO UPDATE SET 
      hours = EXCLUDED.hours,
      status = EXCLUDED.status,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eksport danych do JSON
CREATE OR REPLACE FUNCTION export_time_entries(
  p_employee_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT 
        e.name as employee_name,
        e.position,
        te.date,
        te.hours,
        te.status,
        te.notes
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE (p_employee_id IS NULL OR te.employee_id = p_employee_id)
        AND (p_start_date IS NULL OR te.date >= p_start_date)
        AND (p_end_date IS NULL OR te.date <= p_end_date)
      ORDER BY e.name, te.date
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
