-- Authentication and Subscription Tables

-- User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  industry TEXT CHECK (industry IN ('bakery', 'bar', 'brewery', 'retail', 'restaurant', 'other')),
  business_size TEXT CHECK (business_size IN ('1-5', '6-10', '11-25', '26-50', '50+')),
  setup_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')) DEFAULT 'active',
  plan_name TEXT DEFAULT 'unlimited',
  plan_price DECIMAL(10, 2) DEFAULT 50.00,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Documents Table (for uploaded business context)
CREATE TABLE IF NOT EXISTS business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('manual', 'procedure', 'policy', 'report', 'sales_data', 'inventory_data', 'financial_data', 'other')) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1024),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  available_to_agents TEXT[] DEFAULT ARRAY['all']::TEXT[]
);

-- Automated Reports Configuration
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('daily_sales', 'weekly_staff', 'monthly_financial')) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  schedule_time TIME DEFAULT '09:00:00',
  schedule_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::TEXT[],
  recipients TEXT[] NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Reports Storage
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  report_html TEXT,
  sent_to TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Nudges/Notifications
CREATE TABLE IF NOT EXISTS agent_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Industry Templates
CREATE TABLE IF NOT EXISTS industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates (for HR, drafts, etc.)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft Emails (review before send)
CREATE TABLE IF NOT EXISTS draft_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'approved', 'sent', 'rejected')) DEFAULT 'draft',
  created_by_agent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_industry ON user_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_user ON business_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_type ON business_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_report_schedules_user ON report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_nudges_user ON agent_nudges(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_nudges_dismissed ON agent_nudges(dismissed);
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_emails_user ON draft_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_emails_status ON draft_emails(status);

-- Triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at BEFORE UPDATE ON report_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default industry templates
INSERT INTO industry_templates (industry, template_type, template_name, template_data, description)
VALUES
  ('bakery', 'kpi', 'Bakery KPIs', '{"daily_sales": true, "inventory_turnover": true, "waste_percentage": true, "labor_cost_percentage": true, "average_transaction_value": true, "customer_count": true}', 'Key performance indicators for bakeries'),
  ('bar', 'kpi', 'Bar KPIs', '{"daily_revenue": true, "pour_cost": true, "inventory_turnover": true, "labor_cost_percentage": true, "average_check": true, "customer_count": true}', 'Key performance indicators for bars'),
  ('brewery', 'kpi', 'Brewery KPIs', '{"production_volume": true, "cost_per_barrel": true, "inventory_levels": true, "distribution_metrics": true, "tasting_room_sales": true}', 'Key performance indicators for breweries'),
  ('retail', 'kpi', 'Retail KPIs', '{"daily_sales": true, "inventory_turnover": true, "gross_margin": true, "customer_traffic": true, "conversion_rate": true, "average_sale_value": true}', 'Key performance indicators for retail')
ON CONFLICT DO NOTHING;
