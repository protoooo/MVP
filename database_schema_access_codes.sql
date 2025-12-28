-- Access Codes Table Schema
-- This table stores access codes for the photo analysis system
-- Access codes use the format: BASIC-XXXXX or PREMIUM-XXXXX (5-digit random number with tier prefix)
-- Total length: 11-12 characters (BASIC-12345 or PREMIUM-67890)

CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "BASIC-12345" or "PREMIUM-67890"
  email VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'unused',  -- 'unused', 'processing', 'completed'
  tier VARCHAR(50) DEFAULT 'BASIC',  -- 'BASIC' or 'PREMIUM'
  max_photos INTEGER DEFAULT 200,
  total_photos_uploaded INTEGER DEFAULT 0,
  report_data JSONB,
  report_generated_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);

-- Create index on email for retrieval functionality
CREATE INDEX IF NOT EXISTS idx_access_codes_email ON access_codes(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);

-- Optional: Add a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_access_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER access_codes_updated_at_trigger
  BEFORE UPDATE ON access_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_access_codes_updated_at();

-- Processed Webhook Events Table (for idempotency)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_id ON processed_webhook_events(event_id);

-- Example queries:

-- Check if a code exists and is valid:
-- SELECT * FROM access_codes WHERE code = 'BASIC-12345';

-- Get all codes for an email:
-- SELECT code, status, tier, max_photos, total_photos_uploaded, created_at 
-- FROM access_codes 
-- WHERE email = 'customer@example.com' 
-- ORDER BY created_at DESC;

-- Get unused codes:
-- SELECT code, email, tier, created_at 
-- FROM access_codes 
-- WHERE status = 'unused' 
-- ORDER BY created_at DESC;

-- Update photos uploaded:
-- UPDATE access_codes 
-- SET total_photos_uploaded = total_photos_uploaded + 10,
--     status = CASE 
--       WHEN total_photos_uploaded + 10 >= max_photos THEN 'completed'
--       ELSE 'processing'
--     END
-- WHERE code = 'BASIC-12345';
