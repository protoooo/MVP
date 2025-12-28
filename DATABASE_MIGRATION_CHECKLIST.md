# Database Migration Checklist

## Pre-Migration

### 1. Backup Database ✅
```bash
# Via Supabase Dashboard:
# Settings → Database → Backups → Create backup

# Or via CLI:
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 2. Verify Current Schema
```sql
-- Check current subscriptions structure
\d subscriptions

-- Check current documents structure  
\d documents

-- Check existing functions
\df match_documents
```

### 3. Test in Staging First
- [ ] Run migrations in staging environment
- [ ] Verify application still works
- [ ] Run test scripts
- [ ] Monitor for errors

## Migration Steps

### Step 1: Add Subscription Sector Column
```sql
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'food_safety';

CREATE INDEX IF NOT EXISTS idx_subscriptions_sector 
ON subscriptions(sector);

COMMENT ON COLUMN subscriptions.sector IS 
'The compliance sector this subscription grants access to: food_safety, fire_life_safety, or rental_housing';
```

**Verify:**
```sql
-- Should show new column
\d subscriptions

-- Should return no rows (all have default)
SELECT * FROM subscriptions WHERE sector IS NULL;
```

### Step 2: Add User Role Column
```sql
-- Create table if not exists
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add role column if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
ON user_profiles(role);

COMMENT ON COLUMN user_profiles.role IS 
'User role: "user" (default) or "admin" (unrestricted access to all sectors)';
```

**Verify:**
```sql
-- Should show table structure
\d user_profiles

-- Should return 0 admins initially
SELECT COUNT(*) FROM user_profiles WHERE role = 'admin';
```

### Step 3: Update match_documents Function
```sql
-- Drop old version
DROP FUNCTION IF EXISTS match_documents(vector, float, int, text);

-- Create new version with sector support
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_threshold float,
  match_count int,
  filter_county text DEFAULT NULL,
  filter_sector text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 
    (filter_sector IS NULL OR documents.metadata->>'sector' = filter_sector)
    AND
    (filter_county IS NULL 
     OR filter_county = 'general' 
     OR documents.metadata->>'county' = filter_county
     OR documents.metadata->>'collection' = filter_county)
    AND
    (1 - (documents.embedding <=> query_embedding)) >= match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_documents TO authenticated, service_role;

COMMENT ON FUNCTION match_documents IS 
'Vector similarity search with sector and county filtering';
```

**Verify:**
```sql
-- Should show function with 5 parameters
\df+ match_documents

-- Test call (should work)
SELECT * FROM match_documents(
  (SELECT embedding FROM documents LIMIT 1),
  0.5,
  5,
  NULL,
  'food_safety'
) LIMIT 1;
```

### Step 4: Add Metadata Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_documents_metadata_sector 
ON documents USING GIN ((metadata->>'sector'));

CREATE INDEX IF NOT EXISTS idx_documents_metadata_county 
ON documents USING GIN ((metadata->>'county'));
```

**Verify:**
```sql
-- Should show both indexes
\di idx_documents_metadata_sector
\di idx_documents_metadata_county
```

### Step 5: Update Existing Data
```sql
-- Set all existing subscriptions to food_safety
UPDATE subscriptions 
SET sector = 'food_safety' 
WHERE sector IS NULL;

-- Verify
SELECT sector, COUNT(*) FROM subscriptions GROUP BY sector;
-- Should show: food_safety | <count>
```

### Step 6: Add Constraints
```sql
ALTER TABLE subscriptions 
ADD CONSTRAINT valid_sector_check 
CHECK (sector IN ('food_safety', 'fire_life_safety', 'rental_housing'))
NOT VALID;

-- Validate constraint against existing data
ALTER TABLE subscriptions 
VALIDATE CONSTRAINT valid_sector_check;
```

**Verify:**
```sql
-- Should show constraint
\d+ subscriptions

-- Should succeed
INSERT INTO subscriptions (user_id, sector) 
VALUES (gen_random_uuid(), 'food_safety');

-- Should fail
INSERT INTO subscriptions (user_id, sector) 
VALUES (gen_random_uuid(), 'invalid_sector');
-- Error: violates check constraint "valid_sector_check"

-- Cleanup test
DELETE FROM subscriptions WHERE user_id NOT IN (SELECT id FROM auth.users);
```

### Step 7: Create Analytics View (Optional)
```sql
CREATE OR REPLACE VIEW sector_subscriptions AS
SELECT 
  s.sector,
  COUNT(*) as subscription_count,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trial_count
FROM subscriptions s
GROUP BY s.sector;

GRANT SELECT ON sector_subscriptions TO authenticated, service_role;

COMMENT ON VIEW sector_subscriptions IS 
'Summary of subscriptions by sector for analytics';
```

**Verify:**
```sql
-- Should show breakdown
SELECT * FROM sector_subscriptions;
```

## Post-Migration Verification

### 1. Check All Tables
```sql
-- Subscriptions
SELECT sector, status, COUNT(*) 
FROM subscriptions 
GROUP BY sector, status;

-- User Profiles
SELECT role, COUNT(*) 
FROM user_profiles 
GROUP BY role;

-- Documents (will be populated after re-ingest)
SELECT 
  metadata->>'sector' as sector,
  COUNT(*) 
FROM documents 
GROUP BY metadata->>'sector';
```

### 2. Test Functions
```sql
-- Test with sector filter
SELECT COUNT(*) FROM match_documents(
  (SELECT embedding FROM documents LIMIT 1),
  0.5,
  10,
  NULL,
  'food_safety'
);

-- Test with county filter (legacy)
SELECT COUNT(*) FROM match_documents(
  (SELECT embedding FROM documents LIMIT 1),
  0.5,
  10,
  'michigan',
  NULL
);
```

### 3. Performance Check
```sql
-- Should use index
EXPLAIN ANALYZE
SELECT * FROM documents 
WHERE metadata->>'sector' = 'food_safety' 
LIMIT 100;
-- Look for "Index Scan using idx_documents_metadata_sector"
```

## Rollback Plan

If issues occur:

```sql
-- Remove constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_sector_check;

-- Remove indexes
DROP INDEX IF EXISTS idx_subscriptions_sector;
DROP INDEX IF EXISTS idx_user_profiles_role;
DROP INDEX IF EXISTS idx_documents_metadata_sector;
DROP INDEX IF EXISTS idx_documents_metadata_county;

-- Drop view
DROP VIEW IF EXISTS sector_subscriptions;

-- Remove columns (WARNING: data loss)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS sector;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

-- Restore old match_documents (from backup)
-- [Insert old function definition]
```

## Success Criteria

Migration is successful when:
- ✅ All subscriptions have `sector = 'food_safety'`
- ✅ `match_documents` function accepts 5 parameters
- ✅ Indexes created on metadata fields
- ✅ Constraints validate sector values
- ✅ No errors in application logs
- ✅ Test queries return expected results

## Timeline

Estimated time: 15-30 minutes
- Pre-migration: 5 min
- Migration: 10 min
- Verification: 10 min
- Buffer: 5-15 min

**Best time to run:** During low-traffic period or maintenance window

## Support

For issues:
1. Check verification queries
2. Review error logs
3. Test individual migration steps
4. Contact database admin or technical lead
5. Rollback if critical issue found

## Notes

- ⚠️ Run in staging first
- ⚠️ Take backup before starting
- ⚠️ Monitor application during migration
- ⚠️ Have rollback plan ready
- ✅ All migrations are idempotent (safe to re-run)
