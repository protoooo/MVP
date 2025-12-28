-- SQL Schema for One-Time Purchase License System
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- Table: access_codes
-- Stores 6-digit access codes generated from purchases
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'unused', -- 'unused', 'used', 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_video_duration_seconds INTEGER DEFAULT 0,
  max_video_duration_seconds INTEGER DEFAULT 3600, -- 1 hour = 3600 seconds
  report_data JSONB,
  report_generated_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT false
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_email ON access_codes(email);
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);
CREATE INDEX IF NOT EXISTS idx_access_codes_stripe_payment ON access_codes(stripe_payment_intent_id);

-- ============================================================================
-- Table: code_usage
-- Tracks each use of an access code (video uploads, report views, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'video_upload', 'video_process', 'report_view', 'report_download'
  video_duration_seconds INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Index for fast code usage lookups
CREATE INDEX IF NOT EXISTS idx_code_usage_code_id ON code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_code_usage_action_type ON code_usage(action_type);
CREATE INDEX IF NOT EXISTS idx_code_usage_created_at ON code_usage(created_at DESC);

-- ============================================================================
-- Insert admin code
-- ============================================================================
INSERT INTO access_codes (code, email, status, is_admin, max_video_duration_seconds)
VALUES ('800869', 'admin@protocollm.org', 'unused', true, 999999)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Row Level Security (RLS) - Optional for security
-- ============================================================================
-- Enable RLS on tables
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_usage ENABLE ROW LEVEL SECURITY;

-- Allow public read access to validate codes (with API key protection)
-- The API endpoints will handle actual validation logic
CREATE POLICY "Allow public code validation" ON access_codes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow service role full access to access_codes" ON access_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to code_usage" ON code_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Function: Generate random 6-digit code
-- Drop first to handle any existing function with different signature
-- ============================================================================
DROP FUNCTION IF EXISTS generate_access_code();

CREATE FUNCTION generate_access_code()
RETURNS VARCHAR(6)
LANGUAGE plpgsql
AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-digit code (100000 to 999999)
    new_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM access_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE access_codes IS 'Stores one-time purchase license codes for video processing';
COMMENT ON TABLE code_usage IS 'Tracks usage history for each access code';
COMMENT ON COLUMN access_codes.code IS 'Unique 6-digit access code';
COMMENT ON COLUMN access_codes.status IS 'Code status: unused, used, expired';
COMMENT ON COLUMN access_codes.total_video_duration_seconds IS 'Total seconds of video processed';
COMMENT ON COLUMN access_codes.max_video_duration_seconds IS 'Maximum allowed video duration (3600 = 1 hour)';
COMMENT ON COLUMN access_codes.is_admin IS 'True for admin codes that bypass restrictions';
