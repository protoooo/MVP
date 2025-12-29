-- Standards Profiles Schema for Visual Reasoning API
-- Configurable profiles that define task context and expectations across industries

-- Standards Profiles table - Core abstraction for defining evaluation criteria
CREATE TABLE IF NOT EXISTS standards_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional, null for system profiles
  
  -- Industry and task classification
  industry TEXT NOT NULL, -- 'food', 'retail', 'logistics', 'construction', 'healthcare', 'general', etc.
  task_type TEXT NOT NULL, -- 'receiving', 'storage', 'cleaning', 'delivery', 'inspection', 'general', etc.
  
  -- Evaluation parameters
  strictness_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  -- Plain-language rules (optional, injected into reasoning prompt)
  plain_language_rules TEXT[], -- Array of simple rules like "Boxes should not be damaged"
  
  -- Document references (optional, overrides general reasoning)
  document_ids UUID[], -- References to uploaded documents in document_embeddings table
  
  -- Scoring preferences (optional)
  scoring_preferences JSONB DEFAULT '{}'::jsonb, -- Custom weights, thresholds, etc.
  
  -- System vs Custom profiles
  is_system_profile BOOLEAN DEFAULT false, -- True for default industry profiles
  active BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast profile lookup
CREATE INDEX IF NOT EXISTS idx_standards_profiles_industry ON standards_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_standards_profiles_task_type ON standards_profiles(task_type);
CREATE INDEX IF NOT EXISTS idx_standards_profiles_user_id ON standards_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_standards_profiles_is_system ON standards_profiles(is_system_profile);
CREATE INDEX IF NOT EXISTS idx_standards_profiles_active ON standards_profiles(active);
CREATE INDEX IF NOT EXISTS idx_standards_profiles_system_name ON standards_profiles(is_system_profile, profile_name) WHERE is_system_profile = true;

-- Webhook configuration table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Webhook details
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT, -- For signing payloads
  active BOOLEAN DEFAULT true,
  
  -- Retry configuration
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_user_id ON webhook_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_api_key_id ON webhook_configs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(active);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
  session_id UUID, -- Links to audit_sessions
  
  -- Delivery status
  status TEXT NOT NULL, -- 'pending', 'sent', 'failed', 'retrying'
  attempt_count INTEGER DEFAULT 0,
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config_id ON webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);

-- Update trigger for standards_profiles
CREATE TRIGGER update_standards_profiles_updated_at 
  BEFORE UPDATE ON standards_profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at 
  BEFORE UPDATE ON webhook_configs
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE standards_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Service role can manage all
CREATE POLICY "Service role can manage standards_profiles"
  ON standards_profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage webhook_configs"
  ON webhook_configs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage webhook_deliveries"
  ON webhook_deliveries FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own profiles and system profiles
CREATE POLICY "Users can read own and system profiles"
  ON standards_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_system_profile = true OR auth.role() = 'service_role');

-- Users can manage their own webhooks
CREATE POLICY "Users can read own webhook_configs"
  ON webhook_configs FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON standards_profiles TO service_role;
GRANT ALL ON webhook_configs TO service_role;
GRANT ALL ON webhook_deliveries TO service_role;

-- Insert default system profiles for common industries
INSERT INTO standards_profiles (profile_name, industry, task_type, strictness_level, is_system_profile, description, plain_language_rules)
VALUES
  -- Food Safety Profiles
  ('Food Service - General', 'food', 'general', 'high', true, 
   'General food safety compliance for restaurants and food service establishments',
   ARRAY[
     'Food must be stored at safe temperatures',
     'Surfaces should be clean and sanitized',
     'Raw and ready-to-eat foods must be separated',
     'Employees must maintain proper hygiene',
     'Equipment should be properly maintained'
   ]),
  ('Food - Receiving', 'food', 'receiving', 'high', true,
   'Food receiving and delivery inspection',
   ARRAY[
     'Packages should not be damaged',
     'Temperature-sensitive items must be at proper temp',
     'Products should be properly labeled',
     'Delivery area should be clean'
   ]),
  ('Food - Storage', 'food', 'storage', 'high', true,
   'Food storage area inspection',
   ARRAY[
     'Cold storage must be below 41°F',
     'Hot holding must be above 135°F',
     'Items should be properly organized and labeled',
     'Nothing should be stored on the floor',
     'FIFO (first in, first out) should be followed'
   ]),
  ('Food - Cleaning', 'food', 'cleaning', 'medium', true,
   'Kitchen and food prep area cleaning verification',
   ARRAY[
     'Surfaces should be visibly clean',
     'No food debris should be present',
     'Cleaning supplies should be properly stored',
     'Floors should be clean and dry'
   ]),
  
  -- Retail Profiles
  ('Retail - General', 'retail', 'general', 'medium', true,
   'General retail store operations and compliance',
   ARRAY[
     'Products should be properly displayed',
     'Aisles should be clear and safe',
     'Signage should be accurate',
     'Store should be clean and organized'
   ]),
  ('Retail - Receiving', 'retail', 'receiving', 'medium', true,
   'Retail inventory receiving verification',
   ARRAY[
     'Packages should match delivery manifests',
     'Damaged items should be segregated',
     'Products should be properly counted'
   ]),
  ('Retail - Stocking', 'retail', 'storage', 'medium', true,
   'Retail shelving and stocking verification',
   ARRAY[
     'Products should be faced forward',
     'Shelves should be properly stocked',
     'Price tags should be visible and accurate',
     'Expired products should be removed'
   ]),
  
  -- Logistics Profiles
  ('Logistics - Delivery', 'logistics', 'delivery', 'medium', true,
   'Delivery completion and condition verification',
   ARRAY[
     'Items should match delivery list',
     'Packages should not be damaged',
     'Delivery location should be correct',
     'Signature or proof should be obtained'
   ]),
  ('Logistics - Warehouse', 'logistics', 'storage', 'medium', true,
   'Warehouse organization and safety',
   ARRAY[
     'Aisles should be clear',
     'Items should be properly palletized',
     'Safety equipment should be accessible',
     'Inventory should be organized'
   ]),
  
  -- Construction Profiles
  ('Construction - Safety', 'construction', 'inspection', 'high', true,
   'Construction site safety inspection',
   ARRAY[
     'Workers must wear required PPE',
     'Safety barriers should be in place',
     'Tools should be properly stored',
     'Site should be free of hazards'
   ]),
  ('Construction - Quality', 'construction', 'inspection', 'high', true,
   'Construction work quality verification',
   ARRAY[
     'Work should match specifications',
     'Materials should be properly installed',
     'Finishes should be clean and professional',
     'No visible defects should be present'
   ]),
  
  -- Healthcare Profiles
  ('Healthcare - Cleaning', 'healthcare', 'cleaning', 'high', true,
   'Healthcare facility cleaning verification',
   ARRAY[
     'All surfaces should be sanitized',
     'No biohazards should be visible',
     'Waste should be properly disposed',
     'Cleaning protocols should be followed'
   ]),
  
  -- General Zero-Config Profile
  ('Zero Config - General', 'general', 'general', 'medium', true,
   'Default profile for any industry without specific configuration',
   ARRAY[
     'Work should appear complete',
     'Area should be safe and organized',
     'No obvious issues should be present',
     'Standards of quality should be maintained'
   ])
ON CONFLICT DO NOTHING;
