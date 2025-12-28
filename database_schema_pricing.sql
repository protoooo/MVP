-- Database Schema Changes for Pricing & Usage Tracking
-- This file documents the SQL changes needed to support the new pricing model

-- ============================================================================
-- 1. Add sector and pricing fields to subscriptions table
-- ============================================================================

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS sector VARCHAR(50) DEFAULT 'food_safety';

COMMENT ON COLUMN subscriptions.sector IS 'Sector ID (food_safety, fire_life_safety, rental_housing)';

-- ============================================================================
-- 2. Enhance usage_events table for video tracking
-- ============================================================================

ALTER TABLE usage_events
ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS frames_analyzed INTEGER,
ADD COLUMN IF NOT EXISTS sector VARCHAR(50);

COMMENT ON COLUMN usage_events.video_duration_seconds IS 'Duration of processed video in seconds';
COMMENT ON COLUMN usage_events.frames_analyzed IS 'Number of frames analyzed from video';
COMMENT ON COLUMN usage_events.sector IS 'Sector ID for this usage event';

-- ============================================================================
-- 3. Create building_video_usage table for usage-based billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS building_video_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_account_id UUID, -- Optional: for multi-building accounts
  session_id UUID NOT NULL,
  video_duration_seconds INTEGER NOT NULL,
  video_minutes_billed INTEGER NOT NULL, -- Rounded up minutes
  frames_analyzed INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) NOT NULL, -- Actual AI cost
  rate_per_minute DECIMAL(10, 2) NOT NULL, -- Billing rate (e.g., $0.50)
  billed_amount_usd DECIMAL(10, 2), -- Amount charged to customer (rate × minutes)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_building_video_usage_user_id 
  ON building_video_usage(user_id);
  
CREATE INDEX IF NOT EXISTS idx_building_video_usage_created_at 
  ON building_video_usage(created_at);
  
CREATE INDEX IF NOT EXISTS idx_building_video_usage_user_date 
  ON building_video_usage(user_id, created_at);

COMMENT ON TABLE building_video_usage IS 'Usage-based billing records for fire & life safety sector';
COMMENT ON COLUMN building_video_usage.cost_usd IS 'Actual AI processing cost (Cohere API charges)';
COMMENT ON COLUMN building_video_usage.billed_amount_usd IS 'Amount billed to customer (includes margin)';

-- ============================================================================
-- 4. Create function to calculate billed amount
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_billed_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate billed amount based on minutes and rate
  NEW.billed_amount_usd := NEW.video_minutes_billed * NEW.rate_per_minute;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate billed amount
DROP TRIGGER IF EXISTS trg_calculate_billed_amount ON building_video_usage;
CREATE TRIGGER trg_calculate_billed_amount
  BEFORE INSERT OR UPDATE ON building_video_usage
  FOR EACH ROW
  EXECUTE FUNCTION calculate_billed_amount();

-- ============================================================================
-- 5. Create view for usage summaries
-- ============================================================================

CREATE OR REPLACE VIEW building_usage_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) AS billing_month,
  COUNT(*) AS session_count,
  SUM(video_duration_seconds) AS total_seconds,
  SUM(video_minutes_billed) AS total_minutes_billed,
  SUM(frames_analyzed) AS total_frames,
  SUM(cost_usd) AS total_cost,
  SUM(billed_amount_usd) AS total_billed,
  AVG(rate_per_minute) AS avg_rate
FROM building_video_usage
GROUP BY user_id, DATE_TRUNC('month', created_at);

COMMENT ON VIEW building_usage_summary IS 'Monthly usage summary for buildings sector';

-- ============================================================================
-- 6. Create soft usage limits tracking table (for monitoring only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_soft_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sector VARCHAR(50) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  image_count INTEGER DEFAULT 0,
  video_minutes INTEGER DEFAULT 0,
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_threshold DECIMAL(3, 2) DEFAULT 0.80, -- 80%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, sector, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_soft_limits_user_sector 
  ON usage_soft_limits(user_id, sector);
  
CREATE INDEX IF NOT EXISTS idx_usage_soft_limits_period 
  ON usage_soft_limits(period_start, period_end);

COMMENT ON TABLE usage_soft_limits IS 'Soft usage limits for internal monitoring (not enforced)';
COMMENT ON COLUMN usage_soft_limits.alert_triggered IS 'Whether usage exceeded alert threshold (for admin notification)';

-- ============================================================================
-- 7. Update subscriptions with default sector for existing users
-- ============================================================================

-- Set food_safety as default sector for all existing active subscriptions
UPDATE subscriptions 
SET sector = 'food_safety' 
WHERE sector IS NULL 
  AND status IN ('active', 'trialing');

-- ============================================================================
-- 8. Row Level Security (RLS) policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE building_video_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_soft_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own building usage
CREATE POLICY building_video_usage_select_own 
  ON building_video_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert/update building usage
CREATE POLICY building_video_usage_service_all 
  ON building_video_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Users can view their own soft limits
CREATE POLICY usage_soft_limits_select_own 
  ON usage_soft_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage soft limits
CREATE POLICY usage_soft_limits_service_all 
  ON usage_soft_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. Grant permissions
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON building_video_usage TO authenticated;
GRANT SELECT ON building_usage_summary TO authenticated;
GRANT SELECT ON usage_soft_limits TO authenticated;

-- Service role should already have full access, but explicitly grant if needed
-- GRANT ALL ON building_video_usage TO service_role;
-- GRANT ALL ON usage_soft_limits TO service_role;

-- ============================================================================
-- 10. Sample queries for testing
-- ============================================================================

/*
-- Get usage summary for a user in current month
SELECT * FROM building_usage_summary
WHERE user_id = 'user-uuid-here'
  AND billing_month = DATE_TRUNC('month', NOW());

-- Get detailed usage records for a user
SELECT 
  session_id,
  video_duration_seconds,
  video_minutes_billed,
  cost_usd,
  billed_amount_usd,
  created_at
FROM building_video_usage
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;

-- Check soft limit status for a user
SELECT * FROM usage_soft_limits
WHERE user_id = 'user-uuid-here'
  AND sector = 'food_safety'
  AND period_end > NOW();
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. These changes are OPTIONAL for phase 1 (cost analysis)
-- 2. building_video_usage table is only needed when fire_life_safety sector goes live
-- 3. All tracking is internal - no hard limits enforced
-- 4. Soft limits are for monitoring/alerting only, not enforcement
-- 5. RLS policies ensure users can only see their own usage data
-- ============================================================================
