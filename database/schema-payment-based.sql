-- Database schema for pure API/Webhook food safety compliance engine
-- Run this in Supabase SQL Editor

-- Table for API keys (prepaid credit packs and subscriptions)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional, can be NULL for anonymous keys
  customer_email TEXT NOT NULL,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  tier TEXT, -- 'starter', 'pro', 'enterprise', 'growth', 'chain', 'enterprise_sub'
  subscription_type TEXT, -- NULL for prepaid, 'growth', 'chain', 'enterprise_sub' for subscriptions
  stripe_session_id TEXT,
  stripe_customer_id TEXT, -- For subscription management
  stripe_subscription_id TEXT, -- For active subscriptions
  active BOOLEAN NOT NULL DEFAULT true,
  expires TIMESTAMPTZ, -- For prepaid packs (1 year validity)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Subscription-specific fields
  monthly_included_images INTEGER, -- For Growth/Chain: 3000/20000
  extra_image_rate DECIMAL(10,4), -- For Growth/Chain: 0.03/0.025
  is_unlimited BOOLEAN DEFAULT false -- For Enterprise subscription
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_customer_email ON api_keys(customer_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_customer_id ON api_keys(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_subscription_id ON api_keys(stripe_subscription_id);

-- Table for usage tracking (optional, for subscription metered billing)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  images_processed INTEGER NOT NULL DEFAULT 0,
  session_id UUID, -- Links to audit_sessions
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  billed BOOLEAN DEFAULT false -- For tracking which usage has been billed
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_billed ON usage_logs(billed);

-- Update timestamp trigger for api_keys
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys (allow service role access)
CREATE POLICY "Service role can manage api_keys"
  ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for usage_logs (allow service role access)
CREATE POLICY "Service role can manage usage_logs"
  ON usage_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON usage_logs TO service_role;
