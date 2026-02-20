---
name: timetracker-supabase
description: Supabase database operations skill for TimeTracker. Use when creating migrations, RPC functions, triggers, or complex database queries for the time tracking system.
---

# TimeTracker Supabase Database Skill

This skill handles all database operations, migrations, and Supabase-specific features for the TimeTracker application.

## When to Use This Skill

Use this skill when:
- Creating new database tables or columns
- Writing SQL migrations
- Creating PostgreSQL functions (RPC)
- Setting up triggers for audit logging
- Optimizing database queries
- Creating database indexes
- Setting up Row Level Security (RLS) policies
- Generating TypeScript types from schema
- Debugging database performance issues

## Database Schema Overview

### Core Tables

1. **employees** - Worker records
2. **time_entries** - Time tracking records
3. **change_history** - Audit log
4. **documents** - Scanned delivery documents
5. **sync_queue** - Offline synchronization queue

### Key Relationships

```
employees (1) ──── (*) time_entries
employees (1) ──── (*) change_history
```

## Migration Patterns

### Creating a New Migration

```bash
# Generate migration file
supabase migration new add_feature_name

# File created at: supabase/migrations/TIMESTAMP_add_feature_name.sql
```

### Migration Template

```sql
-- Migration: Add new feature
-- Created: 2026-02-17

-- ==================================================
-- 1. CREATE TABLES
-- ==================================================

CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT check_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- ==================================================
-- 2. CREATE INDEXES
-- ==================================================

CREATE INDEX idx_new_table_name ON new_table(name);
CREATE INDEX idx_new_table_created_at ON new_table(created_at DESC);

-- ==================================================
-- 3. ADD FOREIGN KEYS (if not in CREATE TABLE)
-- ==================================================

ALTER TABLE time_entries 
  ADD COLUMN new_table_id UUID REFERENCES new_table(id) ON DELETE SET NULL;

-- ==================================================
-- 4. CREATE TRIGGERS
-- ==================================================

CREATE TRIGGER new_table_updated_at
  BEFORE UPDATE ON new_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================================================
-- 5. ROW LEVEL SECURITY
-- ==================================================

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON new_table
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==================================================
-- 6. INITIAL DATA (if needed)
-- ==================================================

INSERT INTO new_table (name) VALUES 
  ('Example 1'),
  ('Example 2');

-- ==================================================
-- 7. GRANT PERMISSIONS
-- ==================================================

GRANT ALL ON new_table TO authenticated;
GRANT ALL ON new_table TO service_role;
```

### Rolling Back Migration

```sql
-- Rollback template (add at bottom of migration file)
-- To rollback: Run this section manually

/*
-- Remove triggers
DROP TRIGGER IF EXISTS new_table_updated_at ON new_table;

-- Remove indexes
DROP INDEX IF EXISTS idx_new_table_name;
DROP INDEX IF EXISTS idx_new_table_created_at;

-- Remove foreign keys
ALTER TABLE time_entries DROP COLUMN IF EXISTS new_table_id;

-- Remove table
DROP TABLE IF EXISTS new_table CASCADE;
*/
```

## PostgreSQL Functions (RPC)

### Pattern: Read-Only Query Function

```sql
CREATE OR REPLACE FUNCTION get_employee_statistics(p_employee_id UUID)
RETURNS TABLE (
  total_hours DECIMAL,
  work_hours DECIMAL,
  sick_hours DECIMAL,
  vacation_hours DECIMAL,
  fza_hours DECIMAL,
  days_worked INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(te.hours) as total_hours,
    SUM(CASE WHEN te.status = 'work' THEN te.hours ELSE 0 END) as work_hours,
    SUM(CASE WHEN te.status = 'sick' THEN te.hours ELSE 0 END) as sick_hours,
    SUM(CASE WHEN te.status = 'vacation' THEN te.hours ELSE 0 END) as vacation_hours,
    SUM(CASE WHEN te.status = 'fza' THEN te.hours ELSE 0 END) as fza_hours,
    COUNT(DISTINCT te.date)::INTEGER as days_worked
  FROM time_entries te
  WHERE te.employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage from client:
-- const { data } = await supabase.rpc('get_employee_statistics', { p_employee_id: id });
```

### Pattern: Write Operation Function

```sql
CREATE OR REPLACE FUNCTION bulk_update_time_entries(
  p_employee_ids UUID[],
  p_date DATE,
  p_hours DECIMAL,
  p_status VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_emp_id UUID;
  v_count INTEGER := 0;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF p_hours < 0 OR p_hours > 24 THEN
    RAISE EXCEPTION 'Hours must be between 0 and 24';
  END IF;
  
  IF p_status NOT IN ('work', 'sick', 'vacation', 'fza') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Loop through employees
  FOREACH v_emp_id IN ARRAY p_employee_ids
  LOOP
    INSERT INTO time_entries (employee_id, date, hours, status, created_by)
    VALUES (v_emp_id, p_date, p_hours, p_status, v_user_id)
    ON CONFLICT (employee_id, date) 
    DO UPDATE SET 
      hours = EXCLUDED.hours,
      status = EXCLUDED.status,
      updated_at = NOW(),
      created_by = v_user_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_update_time_entries TO authenticated;
```

### Pattern: Data Aggregation Function

```sql
CREATE OR REPLACE FUNCTION get_monthly_report(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  employee_id UUID,
  employee_name VARCHAR,
  work_hours DECIMAL,
  sick_hours DECIMAL,
  vacation_hours DECIMAL,
  fza_hours DECIMAL,
  total_hours DECIMAL,
  days_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    COALESCE(SUM(CASE WHEN te.status = 'work' THEN te.hours ELSE 0 END), 0) as work_hours,
    COALESCE(SUM(CASE WHEN te.status = 'sick' THEN te.hours ELSE 0 END), 0) as sick_hours,
    COALESCE(SUM(CASE WHEN te.status = 'vacation' THEN te.hours ELSE 0 END), 0) as vacation_hours,
    COALESCE(SUM(CASE WHEN te.status = 'fza' THEN te.hours ELSE 0 END), 0) as fza_hours,
    COALESCE(SUM(te.hours), 0) as total_hours,
    COUNT(DISTINCT te.date)::INTEGER as days_count
  FROM employees e
  LEFT JOIN time_entries te ON e.id = te.employee_id
    AND EXTRACT(YEAR FROM te.date) = p_year
    AND EXTRACT(MONTH FROM te.date) = p_month
  WHERE e.active = true
  GROUP BY e.id, e.name
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Triggers for Automation

### Pattern: Audit Log Trigger

```sql
-- Generic audit logging function
CREATE OR REPLACE FUNCTION log_change()
RETURNS TRIGGER AS $$
DECLARE
  v_description TEXT;
  v_user_email VARCHAR(255);
  v_entity_name VARCHAR(255);
BEGIN
  -- Get user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Build description based on operation
  IF (TG_OP = 'INSERT') THEN
    v_description := TG_TABLE_NAME || ' created: ' || COALESCE(NEW.name, NEW.id::TEXT);
    
    INSERT INTO change_history (
      action, entity_type, entity_id, description,
      new_value, created_by, user_email
    ) VALUES (
      'create', TG_TABLE_NAME, NEW.id, v_description,
      to_jsonb(NEW), auth.uid(), v_user_email
    );
    
  ELSIF (TG_OP = 'UPDATE') THEN
    v_description := TG_TABLE_NAME || ' updated: ' || COALESCE(NEW.name, NEW.id::TEXT);
    
    INSERT INTO change_history (
      action, entity_type, entity_id, description,
      old_value, new_value, created_by, user_email
    ) VALUES (
      'update', TG_TABLE_NAME, NEW.id, v_description,
      to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email
    );
    
  ELSIF (TG_OP = 'DELETE') THEN
    v_description := TG_TABLE_NAME || ' deleted: ' || COALESCE(OLD.name, OLD.id::TEXT);
    
    INSERT INTO change_history (
      action, entity_type, entity_id, description,
      old_value, created_by, user_email
    ) VALUES (
      'delete', TG_TABLE_NAME, OLD.id, v_description,
      to_jsonb(OLD), auth.uid(), v_user_email
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables
CREATE TRIGGER employees_audit
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_change();

CREATE TRIGGER documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_change();
```

### Pattern: Timestamp Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Pattern: Validation Trigger

```sql
CREATE OR REPLACE FUNCTION validate_time_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if date is not in future
  IF NEW.date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot add time entries for future dates';
  END IF;
  
  -- Check if hours are reasonable
  IF NEW.hours < 0 OR NEW.hours > 24 THEN
    RAISE EXCEPTION 'Hours must be between 0 and 24';
  END IF;
  
  -- Check if employee exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = NEW.employee_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Employee not found or inactive';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_validate
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION validate_time_entry();
```

## Indexes for Performance

### When to Create Indexes

Create indexes for:
1. Foreign keys (often automatic)
2. WHERE clause columns (especially in joins)
3. ORDER BY columns
4. Columns in GROUP BY
5. Columns used in LIKE searches (with special index types)

### Pattern: Basic Index

```sql
-- Single column index
CREATE INDEX idx_time_entries_date ON time_entries(date);

-- Multi-column index (order matters!)
CREATE INDEX idx_time_entries_emp_date ON time_entries(employee_id, date);

-- Partial index (filtered)
CREATE INDEX idx_active_employees ON employees(name) WHERE active = true;

-- Index for sorting (DESC for descending queries)
CREATE INDEX idx_change_history_recent ON change_history(created_at DESC);
```

### Pattern: Full-Text Search Index

```sql
-- Add tsvector column
ALTER TABLE documents ADD COLUMN search_vector tsvector;

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION documents_search_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('polish', COALESCE(NEW.ocr_text, '')) ||
    to_tsvector('polish', COALESCE(NEW.file_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_update();

-- Create GIN index for full-text search
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

-- Usage:
-- SELECT * FROM documents WHERE search_vector @@ to_tsquery('polish', 'faktura');
```

## Row Level Security (RLS)

### Pattern: Basic Authentication Policy

```sql
-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Authenticated users full access" ON employees
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Block anonymous users
CREATE POLICY "Block anonymous users" ON employees
  FOR ALL 
  TO anon
  USING (false);
```

### Pattern: User-Specific Access

```sql
-- Only allow users to see/edit their own records
CREATE POLICY "Users can manage own records" ON user_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Pattern: Role-Based Access

```sql
-- Create custom claims function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'user'
  );
$$ LANGUAGE sql STABLE;

-- Admin can do anything
CREATE POLICY "Admins full access" ON employees
  FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Regular users can only read
CREATE POLICY "Users can read" ON employees
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'user');
```

## Views for Complex Queries

### Pattern: Aggregation View

```sql
CREATE OR REPLACE VIEW v_employee_monthly_stats AS
SELECT 
  e.id as employee_id,
  e.name,
  e.position,
  DATE_TRUNC('month', te.date)::DATE as month,
  COUNT(DISTINCT te.date) as days_worked,
  SUM(te.hours) FILTER (WHERE te.status = 'work') as work_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'sick') as sick_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'vacation') as vacation_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'fza') as fza_hours,
  SUM(te.hours) as total_hours
FROM employees e
LEFT JOIN time_entries te ON e.id = te.employee_id
WHERE e.active = true
GROUP BY e.id, e.name, e.position, DATE_TRUNC('month', te.date);

-- Grant access
GRANT SELECT ON v_employee_monthly_stats TO authenticated;
```

### Pattern: Join View

```sql
CREATE OR REPLACE VIEW v_time_entries_detailed AS
SELECT 
  te.id,
  te.date,
  te.hours,
  te.status,
  te.notes,
  e.id as employee_id,
  e.name as employee_name,
  e.position as employee_position,
  te.created_at,
  u.email as created_by_email
FROM time_entries te
JOIN employees e ON e.id = te.employee_id
LEFT JOIN auth.users u ON u.id = te.created_by
ORDER BY te.date DESC, e.name;
```

## Type Generation

### Generate TypeScript Types

```bash
# After any schema changes, regenerate types
supabase gen types typescript --project-ref YOUR_PROJECT_REF > types/database.types.ts

# Or for local development
supabase gen types typescript --local > types/database.types.ts
```

### Using Generated Types

```typescript
import { Database } from '@/types/database.types';

// Table row types
type Employee = Database['public']['Tables']['employees']['Row'];
type TimeEntry = Database['public']['Tables']['time_entries']['Row'];

// Insert types (without auto-generated fields)
type NewEmployee = Database['public']['Tables']['employees']['Insert'];

// Update types (all fields optional)
type UpdateEmployee = Database['public']['Tables']['employees']['Update'];

// Function return types
type MonthlyReport = Database['public']['Functions']['get_monthly_report']['Returns'];
```

## Performance Optimization

### Explain Query Plans

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT e.name, SUM(te.hours)
FROM employees e
JOIN time_entries te ON e.id = te.employee_id
WHERE te.date >= '2026-01-01'
GROUP BY e.id, e.name;

-- Look for:
-- - Sequential scans (bad for large tables)
-- - Index scans (good)
-- - Execution time
```

### Optimizing Slow Queries

```sql
-- Add index for filtered queries
CREATE INDEX idx_time_entries_date_range 
  ON time_entries(employee_id, date) 
  WHERE date >= '2025-01-01';

-- Materialize expensive views
CREATE MATERIALIZED VIEW mv_employee_stats AS
SELECT ... FROM employees ...;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_employee_stats;

-- Create index on materialized view
CREATE INDEX idx_mv_employee_stats_id ON mv_employee_stats(employee_id);
```

### Batch Operations

```sql
-- Instead of multiple single inserts
-- Use batch insert
INSERT INTO time_entries (employee_id, date, hours, status)
SELECT 
  e.id,
  '2026-02-17'::DATE,
  8.0,
  'work'
FROM employees e
WHERE e.active = true;

-- Or use unnest for bulk operations
INSERT INTO time_entries (employee_id, date, hours, status)
SELECT 
  unnest($1::UUID[]),
  $2::DATE,
  $3::DECIMAL,
  $4::VARCHAR;
```

## Backup and Maintenance

### Regular Maintenance Tasks

```sql
-- Vacuum tables (reclaim storage)
VACUUM ANALYZE employees;
VACUUM ANALYZE time_entries;

-- Reindex (fix index bloat)
REINDEX TABLE time_entries;

-- Update statistics
ANALYZE time_entries;
```

### Point-in-Time Recovery

```bash
# Supabase automatically backs up database
# Restore via dashboard: Database → Backups → Restore
```

## Common Debugging Queries

```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

## Edge Functions Setup

### Create OCR Processing Function

```bash
supabase functions new ocr-process
```

```typescript
// supabase/functions/ocr-process/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { imageUrl, documentId } = await req.json();
    
    // Process OCR (use Tesseract or OpenAI Vision)
    const ocrText = await processOCR(imageUrl);
    
    // Update document with OCR results
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    await supabase
      .from('documents')
      .update({ ocr_text: ocrText, status: 'completed' })
      .eq('id', documentId);
    
    return new Response(JSON.stringify({ success: true, ocrText }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Deploy Edge Function

```bash
supabase functions deploy ocr-process
```

## Checklist for Database Changes

Before deploying migrations:

- [ ] Migration file is idempotent (can run multiple times safely)
- [ ] Rollback script is included
- [ ] Indexes are created for new foreign keys
- [ ] RLS policies are added for new tables
- [ ] Triggers are created for updated_at columns
- [ ] Audit logging is set up (if needed)
- [ ] Constraints validate data integrity
- [ ] Types are regenerated after schema changes
- [ ] Performance impact is considered
- [ ] Backup is created before major changes

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Add indexes before they're needed** (easier than adding later)
3. **Use SECURITY DEFINER carefully** (security implications)
4. **Test migrations on staging** before production
5. **Document complex queries** with comments
6. **Use views for complex joins** instead of repeating queries
7. **Validate data in triggers** before it reaches the database
8. **Monitor query performance** regularly
9. **Use appropriate data types** (UUID for IDs, TIMESTAMP WITH TIME ZONE)
10. **Keep migrations small and focused** (one logical change per migration)

---

This skill should help you handle all database-related tasks for TimeTracker efficiently!
