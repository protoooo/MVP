-- Optimized Database Schema for Large Data Handling
-- This schema is split to handle large violation datasets efficiently
-- Run this AFTER the main schema-compliance.sql

-- ============================================================================
-- VIOLATIONS TABLE (separate from analysis_sessions to handle large datasets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  
  -- Violation details
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High')),
  citation TEXT,
  
  -- For video analysis - timestamp of when violation was detected
  timestamp TEXT,
  frame_number INTEGER,
  
  -- Image reference
  image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violations_session_id ON violations(session_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_created_at ON violations(created_at);

-- ============================================================================
-- UPDATE ANALYSIS_SESSIONS TABLE
-- ============================================================================

-- Add column for quick violation counts (denormalized for performance)
ALTER TABLE analysis_sessions 
ADD COLUMN IF NOT EXISTS violation_count_high INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violation_count_medium INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violation_count_low INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violation_count_total INTEGER DEFAULT 0;

-- ============================================================================
-- HELPER FUNCTIONS FOR VIOLATIONS
-- ============================================================================

-- Function to get violations for a session
CREATE OR REPLACE FUNCTION get_session_violations(
  p_session_id UUID
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  severity TEXT,
  citation TEXT,
  timestamp TEXT,
  frame_number INTEGER,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.description,
    v.severity,
    v.citation,
    v.timestamp,
    v.frame_number,
    v.image_url
  FROM violations v
  WHERE v.session_id = p_session_id
  ORDER BY 
    CASE v.severity 
      WHEN 'High' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'Low' THEN 3
    END,
    v.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to update violation counts when violations are inserted
CREATE OR REPLACE FUNCTION update_violation_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE analysis_sessions
    SET 
      violation_count_high = violation_count_high + CASE WHEN NEW.severity = 'High' THEN 1 ELSE 0 END,
      violation_count_medium = violation_count_medium + CASE WHEN NEW.severity = 'Medium' THEN 1 ELSE 0 END,
      violation_count_low = violation_count_low + CASE WHEN NEW.severity = 'Low' THEN 1 ELSE 0 END,
      violation_count_total = violation_count_total + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE analysis_sessions
    SET 
      violation_count_high = violation_count_high - CASE WHEN OLD.severity = 'High' THEN 1 ELSE 0 END,
      violation_count_medium = violation_count_medium - CASE WHEN OLD.severity = 'Medium' THEN 1 ELSE 0 END,
      violation_count_low = violation_count_low - CASE WHEN OLD.severity = 'Low' THEN 1 ELSE 0 END,
      violation_count_total = violation_count_total - 1
    WHERE id = OLD.session_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_violation_counts
AFTER INSERT OR DELETE ON violations
FOR EACH ROW EXECUTE FUNCTION update_violation_counts();

-- ============================================================================
-- ROW LEVEL SECURITY FOR VIOLATIONS
-- ============================================================================

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage violations"
  ON violations
  FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON violations TO service_role;
GRANT EXECUTE ON FUNCTION get_session_violations TO service_role;

-- ============================================================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Note: Run these commands in Supabase Dashboard SQL Editor or via API
-- Storage buckets need to be created via Supabase API or Dashboard

-- Create storage buckets (pseudo-SQL - run via Supabase Dashboard):
-- 1. analysis-uploads (public, 500MB file size limit)
-- 2. analysis-reports (public, 50MB file size limit)

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- NOTE: The work_mem setting below affects the entire PostgreSQL instance.
-- Only use ALTER SYSTEM if you have a dedicated database instance.
-- For shared instances, use session-level settings instead:
--   SET work_mem = '256MB';  -- For current session only
-- 
-- Uncomment the line below ONLY for dedicated database instances:
-- ALTER SYSTEM SET work_mem = '256MB';  -- Instance-wide setting (requires reload)

-- Set optimal ivfflat lists for vector index based on row count
-- If you have < 10k documents: lists = 100 (already set)
-- If you have 10k-100k documents: lists = 1000
-- If you have > 100k documents: lists = sqrt(row_count)

DO $$
DECLARE
  doc_count INTEGER;
  optimal_lists INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM documents;
  
  IF doc_count > 100000 THEN
    optimal_lists := CEIL(SQRT(doc_count));
    
    -- Drop and recreate index with optimal lists
    DROP INDEX IF EXISTS idx_documents_embedding;
    EXECUTE format('CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = %s)', optimal_lists);
    
    RAISE NOTICE 'Recreated vector index with % lists for % documents', optimal_lists, doc_count;
  ELSIF doc_count > 10000 THEN
    DROP INDEX IF EXISTS idx_documents_embedding;
    CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1000);
    
    RAISE NOTICE 'Recreated vector index with 1000 lists for % documents', doc_count;
  ELSE
    RAISE NOTICE 'Current vector index configuration is optimal for % documents', doc_count;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('analysis_sessions', 'violations', 'documents', 'payments')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Summary
SELECT 
  'analysis_sessions' as table_name, 
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('analysis_sessions')) as size
FROM analysis_sessions
UNION ALL
SELECT 
  'violations', 
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('violations'))
FROM violations
UNION ALL
SELECT 
  'documents', 
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('documents'))
FROM documents
UNION ALL
SELECT 
  'payments', 
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('payments'))
FROM payments;
