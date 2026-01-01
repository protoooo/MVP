-- Trial and Subscription Management Schema
-- Adds 30-day free trial logic and subscription tracking

-- ========================================
-- USER PROFILES WITH TRIAL TRACKING
-- ========================================

-- Create or update user_profiles table with trial fields
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  industry VARCHAR(100),
  
  -- Trial and subscription fields
  subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'cancelled'
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment tracking
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Value tracking (to show user the value they're getting)
  total_tasks_completed INTEGER DEFAULT 0,
  total_documents_processed INTEGER DEFAULT 0,
  total_hours_saved DECIMAL(10,2) DEFAULT 0.0,
  total_emails_drafted INTEGER DEFAULT 0,
  total_reports_generated INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status 
  ON user_profiles(subscription_status);
  
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends 
  ON user_profiles(trial_ends_at);

-- ========================================
-- SUBSCRIPTION PLANS
-- ========================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price_cents INTEGER NOT NULL, -- $25 = 2500 cents
  per_member_price_cents INTEGER DEFAULT 0, -- $10 = 1000 cents
  max_members INTEGER DEFAULT 5,
  trial_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plan
INSERT INTO subscription_plans (name, description, base_price_cents, per_member_price_cents, max_members, trial_days)
VALUES (
  'Business Workspace',
  'Complete business automation workspace with 6 agents',
  2500, -- $25/month
  1000, -- $10/month per member
  5,
  30
)
ON CONFLICT DO NOTHING;

-- ========================================
-- VALUE TRACKING FOR TRIAL USERS
-- ========================================

-- Track each action that saves time/money for the user
CREATE TABLE IF NOT EXISTS user_value_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'email_drafted', 'report_generated', 'schedule_created', etc.
  agent_type VARCHAR(50) NOT NULL,
  
  -- Value metrics
  time_saved_minutes INTEGER DEFAULT 0, -- Estimated time saved
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_value_events_user 
  ON user_value_events(user_id, created_at DESC);

-- ========================================
-- TRIAL EXPIRATION NOTIFICATIONS
-- ========================================

CREATE TABLE IF NOT EXISTS trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- '7_days_left', '3_days_left', '1_day_left', 'expired'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_trial_notification UNIQUE (user_id, notification_type)
);

-- ========================================
-- FUNCTIONS FOR TRIAL MANAGEMENT
-- ========================================

-- Function to check if user is in trial
CREATE OR REPLACE FUNCTION is_user_in_trial(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status VARCHAR(50);
  v_trial_ends TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT subscription_status, trial_ends_at
  INTO v_status, v_trial_ends
  FROM user_profiles
  WHERE id = p_user_id;
  
  RETURN v_status = 'trial' AND v_trial_ends > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get days remaining in trial
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_trial_ends TIMESTAMP WITH TIME ZONE;
  v_days_remaining INTEGER;
BEGIN
  SELECT trial_ends_at INTO v_trial_ends
  FROM user_profiles
  WHERE id = p_user_id;
  
  IF v_trial_ends IS NULL THEN
    RETURN 0;
  END IF;
  
  v_days_remaining := EXTRACT(DAY FROM (v_trial_ends - NOW()));
  
  RETURN GREATEST(0, v_days_remaining);
END;
$$ LANGUAGE plpgsql;

-- Function to track value event and update user metrics
CREATE OR REPLACE FUNCTION track_value_event(
  p_user_id UUID,
  p_event_type VARCHAR,
  p_agent_type VARCHAR,
  p_time_saved_minutes INTEGER,
  p_description TEXT
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert value event
  INSERT INTO user_value_events (
    user_id,
    event_type,
    agent_type,
    time_saved_minutes,
    description
  ) VALUES (
    p_user_id,
    p_event_type,
    p_agent_type,
    p_time_saved_minutes,
    p_description
  )
  RETURNING id INTO v_event_id;
  
  -- Update user profile metrics
  UPDATE user_profiles
  SET
    total_hours_saved = total_hours_saved + (p_time_saved_minutes::DECIMAL / 60),
    total_emails_drafted = total_emails_drafted + CASE WHEN p_event_type = 'email_drafted' THEN 1 ELSE 0 END,
    total_reports_generated = total_reports_generated + CASE WHEN p_event_type LIKE '%report%' THEN 1 ELSE 0 END,
    total_tasks_completed = total_tasks_completed + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to upgrade user from trial to paid
CREATE OR REPLACE FUNCTION upgrade_from_trial(
  p_user_id UUID,
  p_stripe_customer_id VARCHAR,
  p_stripe_subscription_id VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles
  SET
    subscription_status = 'active',
    subscription_started_at = NOW(),
    stripe_customer_id = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at = NOW()
  WHERE id = p_user_id
    AND subscription_status = 'trial';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- View: Trial users nearing expiration
CREATE OR REPLACE VIEW trial_users_expiring_soon AS
SELECT 
  up.id,
  up.business_name,
  up.trial_ends_at,
  EXTRACT(DAY FROM (up.trial_ends_at - NOW())) as days_remaining,
  up.total_hours_saved,
  up.total_tasks_completed,
  up.total_emails_drafted,
  up.total_reports_generated
FROM user_profiles up
WHERE up.subscription_status = 'trial'
  AND up.trial_ends_at > NOW()
  AND up.trial_ends_at < NOW() + INTERVAL '7 days'
ORDER BY up.trial_ends_at ASC;

-- View: User value summary
CREATE OR REPLACE VIEW user_value_summary AS
SELECT 
  up.id,
  up.business_name,
  up.subscription_status,
  up.total_hours_saved,
  up.total_tasks_completed,
  up.total_emails_drafted,
  up.total_reports_generated,
  up.total_documents_processed,
  COUNT(DISTINCT ve.agent_type) as agents_used,
  CASE 
    WHEN up.subscription_status = 'trial' THEN get_trial_days_remaining(up.id)
    ELSE NULL
  END as trial_days_remaining
FROM user_profiles up
LEFT JOIN user_value_events ve ON ve.user_id = up.id
GROUP BY up.id, up.business_name, up.subscription_status, up.total_hours_saved,
         up.total_tasks_completed, up.total_emails_drafted, up.total_reports_generated,
         up.total_documents_processed;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_value_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Users can view their own value events
CREATE POLICY "Users can view own value events"
  ON user_value_events FOR SELECT
  USING (user_id = auth.uid());

-- System can insert value events
CREATE POLICY "System can insert value events"
  ON user_value_events FOR INSERT
  WITH CHECK (true);

-- Users can view their trial notifications
CREATE POLICY "Users can view own trial notifications"
  ON trial_notifications FOR SELECT
  USING (user_id = auth.uid());

-- ========================================
-- NOTES
-- ========================================

/*
TRIAL FLOW:
1. User signs up → automatically gets 30-day trial (trial_started_at = NOW, trial_ends_at = NOW + 30 days)
2. During trial, track all value events (emails drafted, reports generated, time saved)
3. Show trial countdown and value delivered in UI
4. Send notifications at 7 days, 3 days, 1 day before expiration
5. After trial expires, user must subscribe to continue

VALUE TRACKING:
- Track specific actions that save time/money
- Estimate time saved for each action (e.g., email draft = 10 minutes, schedule = 30 minutes)
- Show cumulative value in dashboard
- Use this to demonstrate ROI during trial

SUBSCRIPTION:
- Base: $25/month for workspace owner
- Additional members: $10/month each
- Max 5 members total
- Pricing calculated in team page and checkout
*/
