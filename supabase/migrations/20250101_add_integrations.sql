-- Add integrations table for native integrations (Jolt, Lightspeed, etc.)
-- Migration: Add integrations support and Pro tier

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('jolt', 'lightspeed')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Add tier column to subscriptions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'tier'
  ) THEN
    ALTER TABLE subscriptions 
    ADD COLUMN tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'pro'));
  END IF;
END $$;

-- Create index on integrations for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_user_type 
ON integrations(user_id, integration_type);

CREATE INDEX IF NOT EXISTS idx_integrations_status 
ON integrations(status);

-- Add RLS policies for integrations table
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own integrations
CREATE POLICY "Users can view own integrations"
ON integrations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own integrations
CREATE POLICY "Users can insert own integrations"
ON integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own integrations
CREATE POLICY "Users can update own integrations"
ON integrations
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
ON integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON integrations TO authenticated;
GRANT ALL ON integrations TO service_role;

-- Add comments for documentation
COMMENT ON TABLE integrations IS 'Stores OAuth tokens and status for third-party integrations like Jolt and Lightspeed';
COMMENT ON COLUMN integrations.integration_type IS 'Type of integration: jolt, lightspeed';
COMMENT ON COLUMN integrations.access_token IS 'OAuth access token (stored as text, consider encryption at application level for production)';
COMMENT ON COLUMN integrations.refresh_token IS 'OAuth refresh token (stored as text, consider encryption at application level for production)';
COMMENT ON COLUMN integrations.status IS 'Connection status: connected, disconnected, error';
COMMENT ON COLUMN integrations.last_sync_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN integrations.metadata IS 'Additional integration-specific metadata';
