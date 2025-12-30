-- Database schema for Michigan Tenant Condition Report System
-- Run this in Supabase SQL Editor

-- Table for tenant reports (one-time payment, no subscriptions)
CREATE TABLE IF NOT EXISTS tenant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent TEXT,
  customer_email TEXT NOT NULL,
  
  -- Report metadata
  total_photos INTEGER NOT NULL DEFAULT 0,
  property_address TEXT,
  property_latitude DECIMAL(10, 8), -- GPS latitude for validation
  property_longitude DECIMAL(11, 8), -- GPS longitude for validation
  tenant_identifier TEXT, -- Optional, can be anonymous
  
  -- Report status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  amount_paid INTEGER NOT NULL DEFAULT 2000, -- $20.00 in cents
  
  -- Report data
  json_report JSONB,
  pdf_path TEXT, -- Path to PDF in storage
  pdf_url TEXT, -- Public URL to download PDF
  access_code TEXT UNIQUE, -- Unique code for accessing report (obfuscated)
  secret_link TEXT UNIQUE, -- Obfuscated URL path (e.g., ax72-99p3-z218)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_completed_at TIMESTAMPTZ,
  report_generated_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Reports expire after 48 hours (changed from 90 days)
  
  -- Rate limiting & abuse prevention
  ip_address TEXT,
  user_agent TEXT,
  duplicate_check_hash TEXT -- Hash of photo content for duplicate detection
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tenant_reports_stripe_session ON tenant_reports(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_customer_email ON tenant_reports(customer_email);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_access_code ON tenant_reports(access_code);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_status ON tenant_reports(status);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_created_at ON tenant_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_reports_ip ON tenant_reports(ip_address);

-- Table for uploaded photos for tenant reports
CREATE TABLE IF NOT EXISTS tenant_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES tenant_reports(id) ON DELETE CASCADE,
  
  -- Photo metadata
  file_path TEXT NOT NULL, -- Path in storage
  file_size INTEGER,
  mime_type TEXT,
  room_area TEXT, -- 'kitchen', 'bathroom', 'bedroom', 'living_room', 'general', etc.
  
  -- EXIF metadata (for forensic evidence)
  exif_date_time TIMESTAMPTZ, -- Original photo timestamp from EXIF
  exif_latitude DECIMAL(10, 8), -- GPS latitude from EXIF
  exif_longitude DECIMAL(11, 8), -- GPS longitude from EXIF
  exif_make TEXT, -- Camera make
  exif_model TEXT, -- Camera model
  server_upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(), -- Trusted server timestamp
  
  -- Metadata validation
  has_exif_metadata BOOLEAN DEFAULT false,
  gps_validated BOOLEAN DEFAULT false, -- True if GPS matches property location
  gps_distance_miles DECIMAL(6, 2), -- Distance from property in miles
  metadata_warning TEXT, -- Warning message if metadata is missing or suspicious
  
  -- Analysis results
  analyzed BOOLEAN DEFAULT false,
  violation BOOLEAN DEFAULT false,
  violation_type TEXT,
  severity TEXT, -- 'high', 'medium', 'low'
  confidence DECIMAL(3,2), -- 0.00-1.00
  confidence_level TEXT, -- 'clear_violation', 'likely_issue', 'requires_assessment'
  
  -- AI analysis data
  analysis_data JSONB,
  
  -- Image hash for duplicate detection
  content_hash TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_photos_report_id ON tenant_photos(report_id);
CREATE INDEX IF NOT EXISTS idx_tenant_photos_analyzed ON tenant_photos(analyzed);
CREATE INDEX IF NOT EXISTS idx_tenant_photos_violation ON tenant_photos(violation);
CREATE INDEX IF NOT EXISTS idx_tenant_photos_content_hash ON tenant_photos(content_hash);

-- Table for rate limiting (IP-based)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'upload', 'payment', 'download'
  
  -- Counters
  attempts INTEGER NOT NULL DEFAULT 1,
  
  -- Time windows
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL,
  
  -- Blocking
  blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);

-- Table for non-visible issues checklist (user-provided)
CREATE TABLE IF NOT EXISTS tenant_non_visible_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES tenant_reports(id) ON DELETE CASCADE,
  
  -- Checklist items (non-photographable issues)
  no_heat BOOLEAN DEFAULT false,
  no_hot_water BOOLEAN DEFAULT false,
  outlets_not_working BOOLEAN DEFAULT false,
  gas_leak BOOLEAN DEFAULT false,
  poor_ventilation BOOLEAN DEFAULT false,
  noise_issues BOOLEAN DEFAULT false,
  pest_not_visible BOOLEAN DEFAULT false,
  security_concerns BOOLEAN DEFAULT false,
  inadequate_lighting BOOLEAN DEFAULT false,
  water_pressure_issues BOOLEAN DEFAULT false,
  
  -- Free-form additional issues
  other_issues TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_non_visible_issues_report_id ON tenant_non_visible_issues(report_id);

-- Update timestamp trigger for tenant_reports
CREATE OR REPLACE FUNCTION update_tenant_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set expires_at to 48 hours from report generation (burn after reading policy)
  IF NEW.report_generated_at IS NOT NULL AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NEW.report_generated_at + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tenant_reports_set_expiry BEFORE UPDATE ON tenant_reports
  FOR EACH ROW EXECUTE FUNCTION update_tenant_reports_updated_at();

-- Function to clean up expired reports (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reports that have expired
  DELETE FROM tenant_reports
  WHERE expires_at < now() 
    AND status = 'completed';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Enable Row Level Security (RLS)
ALTER TABLE tenant_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_non_visible_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role access)
CREATE POLICY "Service role can manage tenant_reports"
  ON tenant_reports
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tenant_photos"
  ON tenant_photos
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rate_limits"
  ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tenant_non_visible_issues"
  ON tenant_non_visible_issues
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON tenant_reports TO service_role;
GRANT ALL ON tenant_photos TO service_role;
GRANT ALL ON rate_limits TO service_role;
GRANT ALL ON tenant_non_visible_issues TO service_role;

-- Function for duplicate photo detection
CREATE OR REPLACE FUNCTION check_duplicate_photos(
  p_content_hash TEXT,
  p_report_id UUID,
  p_hours_window INTEGER DEFAULT 24
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  existing_report_id UUID,
  upload_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_duplicate,
    tp.report_id as existing_report_id,
    tp.created_at as upload_time
  FROM tenant_photos tp
  JOIN tenant_reports tr ON tp.report_id = tr.id
  WHERE tp.content_hash = p_content_hash
    AND tp.report_id != p_report_id
    AND tp.created_at > now() - (p_hours_window || ' hours')::INTERVAL
  ORDER BY tp.created_at DESC
  LIMIT 1;
END;
$$ language 'plpgsql';

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  attempts_remaining INTEGER,
  reset_time TIMESTAMPTZ
) AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count attempts in current window
  SELECT COALESCE(SUM(rl.attempts), 0) INTO current_attempts
  FROM rate_limits rl
  WHERE rl.ip_address = p_ip_address
    AND rl.action_type = p_action_type
    AND rl.window_start >= window_start
    AND (rl.blocked = false OR rl.blocked_until < now());
  
  -- Check if blocked
  IF current_attempts >= p_max_attempts THEN
    RETURN QUERY SELECT 
      false as allowed,
      0 as attempts_remaining,
      (now() + (p_window_minutes || ' minutes')::INTERVAL) as reset_time;
  ELSE
    RETURN QUERY SELECT 
      true as allowed,
      (p_max_attempts - current_attempts) as attempts_remaining,
      (now() + (p_window_minutes || ' minutes')::INTERVAL) as reset_time;
  END IF;
END;
$$ language 'plpgsql';

-- Function to record rate limit attempt
CREATE OR REPLACE FUNCTION record_rate_limit_attempt(
  p_ip_address TEXT,
  p_action_type TEXT,
  p_window_minutes INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limits (
    ip_address,
    action_type,
    attempts,
    window_start,
    window_end
  ) VALUES (
    p_ip_address,
    p_action_type,
    1,
    now(),
    now() + (p_window_minutes || ' minutes')::INTERVAL
  );
END;
$$ language 'plpgsql';

-- ============================================================================
-- MICHIGAN TENANT LAW DOCUMENT SEARCH FUNCTIONS
-- ============================================================================

-- Table for storing Michigan tenant law documents (embeddings for vector search)
-- This table should be populated with Michigan tenant rights documents, statutes, etc.
CREATE TABLE IF NOT EXISTS tenant_law_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1024), -- Cohere embed-v4.0 uses 1024 dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_law_documents_embedding ON tenant_law_documents 
  USING ivfflat (embedding vector_cosine_ops);

-- Function to search Michigan tenant law documents using vector similarity
-- This is used by tenantAnalysis.js to find relevant statutes and citations
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_threshold DOUBLE PRECISION DEFAULT 0.25,
  match_count INTEGER DEFAULT 10,
  filter_county TEXT DEFAULT 'michigan_tenant'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tenant_law_documents.id,
    tenant_law_documents.content,
    tenant_law_documents.metadata,
    1 - (tenant_law_documents.embedding <=> query_embedding) AS similarity
  FROM tenant_law_documents
  WHERE 
    (tenant_law_documents.metadata->>'county' = filter_county 
     OR tenant_law_documents.metadata->>'type' = 'statewide'
     OR filter_county = 'michigan_tenant')
    AND 1 - (tenant_law_documents.embedding <=> query_embedding) >= match_threshold
  ORDER BY tenant_law_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ language 'plpgsql';

-- Grant permissions for document search
GRANT SELECT ON tenant_law_documents TO service_role;
GRANT EXECUTE ON FUNCTION match_documents TO service_role;
