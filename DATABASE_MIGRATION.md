# Database Migration Guide

This document outlines the required database schema changes to support the new image-only analysis system with tiered passcode pricing.

## Required Schema Changes

### 1. Update `access_codes` table

Add columns to support photo-based limits and tier tracking:

```sql
-- Add photo limit columns
ALTER TABLE access_codes 
ADD COLUMN IF NOT EXISTS max_photos INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS total_photos_uploaded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_codes_tier ON access_codes(tier);
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);

-- Optional: Add constraint to validate tier values
ALTER TABLE access_codes 
ADD CONSTRAINT chk_tier CHECK (tier IN ('BASIC', 'PREMIUM', 'LEGACY') OR tier IS NULL);
```

### 2. Create `processing_costs` table

New table to log processing costs per session:

```sql
CREATE TABLE IF NOT EXISTS processing_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID,
  photo_count INTEGER NOT NULL CHECK (photo_count >= 0),
  api_cost DECIMAL(10, 4) NOT NULL CHECK (api_cost >= 0),
  cost_per_photo DECIMAL(10, 4) NOT NULL DEFAULT 0.01,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add indexes
  CONSTRAINT fk_processing_costs_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_processing_costs_session ON processing_costs(session_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_user ON processing_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_timestamp ON processing_costs(timestamp DESC);
```

### 3. Update existing access codes (migration)

For existing codes in the database, set defaults:

```sql
-- Set defaults for existing codes
UPDATE access_codes 
SET 
  max_photos = 200,
  total_photos_uploaded = 0,
  tier = 'LEGACY'
WHERE max_photos IS NULL;

-- Optional: Remove old video-related columns if they exist
-- ALTER TABLE access_codes DROP COLUMN IF EXISTS max_video_duration_seconds;
-- ALTER TABLE access_codes DROP COLUMN IF EXISTS total_video_duration_seconds;
```

## Verification Queries

After migration, verify the changes:

```sql
-- Check access_codes schema
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'access_codes'
ORDER BY ordinal_position;

-- Check processing_costs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'processing_costs'
);

-- View sample of updated access codes
SELECT code, tier, max_photos, total_photos_uploaded, status
FROM access_codes
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback Plan

If you need to rollback these changes:

```sql
-- Remove new columns from access_codes
ALTER TABLE access_codes 
DROP COLUMN IF EXISTS max_photos,
DROP COLUMN IF EXISTS total_photos_uploaded,
DROP COLUMN IF EXISTS tier;

-- Drop processing_costs table
DROP TABLE IF EXISTS processing_costs;

-- Remove indexes
DROP INDEX IF EXISTS idx_access_codes_tier;
DROP INDEX IF EXISTS idx_access_codes_status;
```

## Notes

- The `tier` column accepts 'BASIC', 'PREMIUM', or 'LEGACY' (for old codes)
- The `max_photos` default is 200 (BASIC tier)
- The `cost_per_photo` default is 0.01 ($0.01 per image)
- All timestamps use UTC timezone (timestamptz)
- Foreign key constraints allow NULL user_id for anonymous sessions

## Testing

After migration, test:

1. Create a new BASIC access code via Stripe webhook
2. Verify code format is `BASIC-XXXXX`
3. Upload photos and verify `total_photos_uploaded` increments
4. Process report and verify entry in `processing_costs` table
5. Attempt upload after reaching photo limit
6. Verify passcode locks after processing
