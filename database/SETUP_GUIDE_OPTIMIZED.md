# Database Setup Guide - Avoiding Size Errors

## Problem: SQL Paste Size Limits

Supabase SQL Editor has a ~3MB paste limit. When pasting large SQL scripts or when your database grows large, you may encounter errors like:
- "Request entity too large"
- "SQL script too large"
- JSONB field size errors

## Solution: Run SQL in Chunks

### Step 1: Initial Schema Setup

Run these in order in Supabase SQL Editor:

#### Chunk 1: Extensions and Base Tables
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Analysis sessions table
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passcode TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('qa', 'image', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  upload_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  input_metadata JSONB DEFAULT '{}',
  output_summary JSONB DEFAULT '{}',
  pdf_url TEXT,
  violation_count_high INTEGER DEFAULT 0,
  violation_count_medium INTEGER DEFAULT 0,
  violation_count_low INTEGER DEFAULT 0,
  violation_count_total INTEGER DEFAULT 0
);
```

#### Chunk 2: More Tables
```sql
-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('image', 'video')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  chunk TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Violations table (optimized for large datasets)
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High')),
  citation TEXT,
  timestamp TEXT,
  frame_number INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Chunk 3: Indexes
```sql
-- Analysis sessions indexes
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_passcode ON analysis_sessions(passcode);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_type ON analysis_sessions(type);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);

-- Violations indexes
CREATE INDEX IF NOT EXISTS idx_violations_session_id ON violations(session_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_created_at ON violations(created_at);
```

#### Chunk 4: Functions Part 1
```sql
-- Document matching function
CREATE OR REPLACE FUNCTION match_compliance_documents(
  query_embedding vector(1024),
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  chunk TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.source,
    documents.chunk,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) >= match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

#### Chunk 5: Functions Part 2
```sql
-- Timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Violation counts update function
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

-- Get session violations function
CREATE OR REPLACE FUNCTION get_session_violations(p_session_id UUID)
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
  SELECT v.id, v.description, v.severity, v.citation, v.timestamp, v.frame_number, v.image_url
  FROM violations v
  WHERE v.session_id = p_session_id
  ORDER BY CASE v.severity WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END, v.created_at;
END;
$$ LANGUAGE plpgsql;
```

#### Chunk 6: Triggers
```sql
-- Create triggers
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_violation_counts
  AFTER INSERT OR DELETE ON violations
  FOR EACH ROW EXECUTE FUNCTION update_violation_counts();
```

#### Chunk 7: Security Part 1
```sql
-- Enable RLS
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
```

#### Chunk 8: Security Part 2
```sql
-- Create policies
CREATE POLICY "Service role can manage analysis_sessions"
  ON analysis_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage documents"
  ON documents FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage violations"
  ON violations FOR ALL
  USING (auth.role() = 'service_role');
```

#### Chunk 9: Permissions
```sql
-- Grant permissions
GRANT ALL ON analysis_sessions TO service_role;
GRANT ALL ON payments TO service_role;
GRANT ALL ON documents TO service_role;
GRANT ALL ON violations TO service_role;
GRANT EXECUTE ON FUNCTION match_compliance_documents TO service_role;
GRANT EXECUTE ON FUNCTION get_session_violations TO service_role;
```

### Step 2: Verify Installation

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

## Avoiding JSONB Size Issues

### Problem
The `output_summary` and `input_metadata` JSONB fields can grow very large with many violations.

### Solution
Use the separate `violations` table instead:

**Old approach (can cause size errors):**
```javascript
await supabase
  .from('analysis_sessions')
  .update({
    output_summary: { violations: largeArrayOfViolations } // Can exceed size limits!
  })
```

**New approach (optimized):**
```javascript
// 1. Create session
const { data: session } = await supabase
  .from('analysis_sessions')
  .insert({ type: 'image', passcode: '12345' })
  .select()
  .single()

// 2. Insert violations separately
const violationsData = violations.map(v => ({
  session_id: session.id,
  description: v.description,
  severity: v.severity,
  citation: v.citation
}))

await supabase.from('violations').insert(violationsData)

// Counts are automatically updated by trigger!
```

## Storage Bucket Setup

Create these buckets in Supabase Dashboard (Storage section):

1. **analysis-uploads**
   - Public: Yes
   - File size limit: 500 MB
   - Allowed MIME types: image/*, video/*

2. **analysis-reports**
   - Public: Yes
   - File size limit: 50 MB
   - Allowed MIME types: application/pdf

## Monitoring Database Size

```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Largest rows
SELECT 
  id,
  type,
  pg_column_size(input_metadata) as input_size,
  pg_column_size(output_summary) as output_size,
  pg_column_size(row(analysis_sessions.*)) as total_row_size
FROM analysis_sessions
ORDER BY pg_column_size(row(analysis_sessions.*)) DESC
LIMIT 10;
```

## Troubleshooting

### Error: "row is too big"
- **Cause:** Single row exceeds PostgreSQL's limit
- **Solution:** Use separate `violations` table instead of storing in JSONB

### Error: "Request entity too large"
- **Cause:** Trying to paste >3MB SQL in Supabase SQL Editor
- **Solution:** Run SQL in chunks as shown above

### Error: "index row size exceeds btree version 4 maximum"
- **Cause:** Indexed column data too large
- **Solution:** Reduce size of TEXT fields or remove index

### Slow queries on large tables
- **Cause:** Missing or outdated indexes
- **Solution:** Run ANALYZE and VACUUM:
```sql
VACUUM ANALYZE analysis_sessions;
VACUUM ANALYZE violations;
VACUUM ANALYZE documents;
```

## Best Practices

1. **Never store large arrays in JSONB** - Use separate tables
2. **Run SQL in chunks** - Especially for initial setup
3. **Monitor table sizes** - Use the monitoring queries above
4. **Vacuum regularly** - Keeps indexes optimized
5. **Use separate violations table** - Designed for unlimited violations per session
