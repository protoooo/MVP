-- Database Schema Updates for Multi-Sector Support
-- Run these migrations in your Supabase SQL editor

-- ============================================================================
-- 1. Add sector column to subscriptions table
-- ============================================================================

-- Add sector field to subscriptions to track which sector user subscribed to
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'food_safety';

-- Add index for faster sector-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_sector ON subscriptions(sector);

-- Comment to document the field
COMMENT ON COLUMN subscriptions.sector IS 'The compliance sector this subscription grants access to: food_safety, fire_life_safety, or rental_housing';


-- ============================================================================
-- 2. Add role column to user_profiles table for admin detection
-- ============================================================================

-- Ensure user_profiles table exists
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add role column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Comment to document the field
COMMENT ON COLUMN user_profiles.role IS 'User role: "user" (default) or "admin" (unrestricted access to all sectors)';


-- ============================================================================
-- 3. Update match_documents function to support sector filtering
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS match_documents(vector, float, int, text);

-- Recreate with sector support
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
    -- Sector filter (priority over county)
    (filter_sector IS NULL OR documents.metadata->>'sector' = filter_sector)
    AND
    -- County filter (legacy, for backward compatibility)
    (filter_county IS NULL 
     OR filter_county = 'general' 
     OR documents.metadata->>'county' = filter_county
     OR documents.metadata->>'collection' = filter_county)
    AND
    -- Similarity threshold
    (1 - (documents.embedding <=> query_embedding)) >= match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents TO authenticated, service_role;

-- Comment to document the function
COMMENT ON FUNCTION match_documents IS 'Vector similarity search with sector and county filtering for multi-sector compliance platform';


-- ============================================================================
-- 4. Add sector index to documents metadata
-- ============================================================================

-- Create GIN index on metadata->>'sector' for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_metadata_sector ON documents USING GIN ((metadata->>'sector'));

-- Also ensure county index exists for backward compatibility
CREATE INDEX IF NOT EXISTS idx_documents_metadata_county ON documents USING GIN ((metadata->>'county'));


-- ============================================================================
-- 5. Update existing subscriptions to have default sector
-- ============================================================================

-- Set all existing subscriptions to food_safety sector (backward compatibility)
UPDATE subscriptions 
SET sector = 'food_safety' 
WHERE sector IS NULL;


-- ============================================================================
-- 6. Add constraint to validate sector values
-- ============================================================================

ALTER TABLE subscriptions 
ADD CONSTRAINT valid_sector_check 
CHECK (sector IN ('food_safety', 'fire_life_safety', 'rental_housing'))
NOT VALID;

-- Validate existing data
ALTER TABLE subscriptions 
VALIDATE CONSTRAINT valid_sector_check;


-- ============================================================================
-- 7. Create view for sector access reporting (optional, for analytics)
-- ============================================================================

CREATE OR REPLACE VIEW sector_subscriptions AS
SELECT 
  s.sector,
  COUNT(*) as subscription_count,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trial_count
FROM subscriptions s
GROUP BY s.sector;

GRANT SELECT ON sector_subscriptions TO authenticated, service_role;

COMMENT ON VIEW sector_subscriptions IS 'Summary of subscriptions by sector for analytics';
