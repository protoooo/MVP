-- Migration: Add knowledge base tables
-- Description: Tables for rate limiting, query tracking, and analytics

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  limit_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_type 
  ON rate_limits(identifier, limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON rate_limits(window_start);

-- Knowledge base queries tracking
CREATE TABLE IF NOT EXISTS knowledge_base_queries (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_queries_timestamp 
  ON knowledge_base_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_kb_queries_ip 
  ON knowledge_base_queries(ip_address);

-- Free image analyses tracking
CREATE TABLE IF NOT EXISTS free_image_analyses (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  issues_detected INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_images_timestamp 
  ON free_image_analyses(timestamp);
CREATE INDEX IF NOT EXISTS idx_free_images_ip 
  ON free_image_analyses(ip_address);
CREATE INDEX IF NOT EXISTS idx_free_images_email 
  ON free_image_analyses(email);

-- Add conversion tracking
-- This links knowledge base usage to actual conversions
CREATE TABLE IF NOT EXISTS knowledge_base_conversions (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP or email
  conversion_type TEXT NOT NULL, -- 'search_to_image', 'image_to_purchase'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_conversions_identifier 
  ON knowledge_base_conversions(identifier);
CREATE INDEX IF NOT EXISTS idx_kb_conversions_type 
  ON knowledge_base_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_kb_conversions_timestamp 
  ON knowledge_base_conversions(timestamp);

-- Add update trigger for rate_limits
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rate_limits_updated_at 
  BEFORE UPDATE ON rate_limits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Rate limiting for public API endpoints';
COMMENT ON TABLE knowledge_base_queries IS 'Tracking for knowledge base search queries';
COMMENT ON TABLE free_image_analyses IS 'Tracking for free image analysis feature';
COMMENT ON TABLE knowledge_base_conversions IS 'Conversion tracking from free features to paid plans';
