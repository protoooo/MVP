-- Migration: Create notification preferences and access code tracking tables
-- Purpose: Store user opt-in preferences for inspection reminders and regulation updates
-- Author: Copilot
-- Date: 2025-12-28

-- ============================================================================
-- Table: user_notification_preferences
-- Stores email notification preferences for one-time purchasers
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Notification opt-ins
  opted_in_inspection_reminders BOOLEAN NOT NULL DEFAULT false,
  opted_in_regulation_updates BOOLEAN NOT NULL DEFAULT false,
  
  -- Optional establishment info for targeted communications
  establishment_type TEXT CHECK (establishment_type IN ('restaurant', 'cafe', 'food_truck', 'catering', 'bakery', 'bar', 'other', NULL)),
  
  -- Tracking
  last_reminder_sent TIMESTAMPTZ,
  last_regulation_update_sent TIMESTAMPTZ,
  
  -- Unsubscribe tokens
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  unsubscribed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient email lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_email ON user_notification_preferences(email);

-- Index for finding users needing reminders
CREATE INDEX IF NOT EXISTS idx_notification_prefs_reminders ON user_notification_preferences(opted_in_inspection_reminders, last_reminder_sent) 
WHERE opted_in_inspection_reminders = true AND unsubscribed_at IS NULL;

-- Index for finding users opted in for regulation updates
CREATE INDEX IF NOT EXISTS idx_notification_prefs_regulation ON user_notification_preferences(opted_in_regulation_updates) 
WHERE opted_in_regulation_updates = true AND unsubscribed_at IS NULL;

-- Index for unsubscribe token lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_unsub_token ON user_notification_preferences(unsubscribe_token);

-- ============================================================================
-- Table: access_code_tracking (extends existing access_codes)
-- Enhanced tracking for access code usage and retrieval
-- Note: Assumes access_codes table already exists from webhook implementation
-- ============================================================================

-- Add notification preferences link to access_codes table
-- This links the access code to notification preferences when user opts in
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'access_codes' 
    AND column_name = 'notification_preference_id'
  ) THEN
    ALTER TABLE access_codes 
    ADD COLUMN notification_preference_id UUID REFERENCES user_notification_preferences(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for linking
CREATE INDEX IF NOT EXISTS idx_access_codes_notification_pref ON access_codes(notification_preference_id);

-- ============================================================================
-- Function: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Grant permissions (adjust based on your Supabase setup)
-- ============================================================================
-- Allow authenticated and service role access
-- ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Note: Since this is for one-time purchasers without accounts,
-- we'll control access through API endpoints with service role only
-- No RLS policies needed

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE user_notification_preferences IS 'Stores email notification preferences for one-time inspection report purchasers';
COMMENT ON COLUMN user_notification_preferences.email IS 'Customer email address from Stripe purchase';
COMMENT ON COLUMN user_notification_preferences.opted_in_inspection_reminders IS 'True if user wants semi-annual inspection season reminders (March/September)';
COMMENT ON COLUMN user_notification_preferences.opted_in_regulation_updates IS 'True if user wants Michigan food code update notifications';
COMMENT ON COLUMN user_notification_preferences.establishment_type IS 'Optional: Type of food establishment for targeted communications';
COMMENT ON COLUMN user_notification_preferences.last_reminder_sent IS 'Timestamp of last inspection reminder email sent';
COMMENT ON COLUMN user_notification_preferences.last_regulation_update_sent IS 'Timestamp of last regulation update email sent';
COMMENT ON COLUMN user_notification_preferences.unsubscribe_token IS 'Unique token for unsubscribe links';
COMMENT ON COLUMN user_notification_preferences.unsubscribed_at IS 'Timestamp when user unsubscribed from all emails';
