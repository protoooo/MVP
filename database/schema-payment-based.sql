-- Database schema for payment-based food safety app (no authentication)
-- Run this in Supabase SQL Editor

-- Table for API keys (prepaid credit packs)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional, can be NULL for anonymous keys
  customer_email TEXT NOT NULL,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  tier TEXT, -- 'small', 'medium', 'large'
  stripe_session_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  expires TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_customer_email ON api_keys(customer_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

-- Table for one-off $50 reports
CREATE TABLE IF NOT EXISTS one_off_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID, -- Links to audit_sessions after processing
  customer_email TEXT,
  stripe_session_id TEXT,
  file_count INTEGER NOT NULL DEFAULT 0,
  file_data JSONB, -- Store file metadata
  status TEXT NOT NULL DEFAULT 'pending_payment', -- 'pending_payment', 'paid', 'processing', 'completed', 'failed'
  payment_amount INTEGER, -- Amount in cents
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast report lookup
CREATE INDEX IF NOT EXISTS idx_one_off_reports_stripe_session ON one_off_reports(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_one_off_reports_status ON one_off_reports(status);
CREATE INDEX IF NOT EXISTS idx_one_off_reports_session_id ON one_off_reports(session_id);

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

CREATE TRIGGER update_one_off_reports_updated_at BEFORE UPDATE ON one_off_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_off_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys (allow service role access)
CREATE POLICY "Service role can manage api_keys"
  ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for one_off_reports (allow service role access)
CREATE POLICY "Service role can manage one_off_reports"
  ON one_off_reports
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON api_keys TO service_role;
GRANT ALL ON one_off_reports TO service_role;
