-- Enable Row Level Security on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_emails ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Subscriptions Policies
-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Business Documents Policies
-- Users can read their own documents
CREATE POLICY "Users can read own documents"
ON business_documents FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
ON business_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
ON business_documents FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON business_documents FOR DELETE
USING (auth.uid() = user_id);

-- Report Schedules Policies
-- Users can read their own report schedules
CREATE POLICY "Users can read own report schedules"
ON report_schedules FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own report schedules
CREATE POLICY "Users can insert own report schedules"
ON report_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own report schedules
CREATE POLICY "Users can update own report schedules"
ON report_schedules FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own report schedules
CREATE POLICY "Users can delete own report schedules"
ON report_schedules FOR DELETE
USING (auth.uid() = user_id);

-- Generated Reports Policies
-- Users can read their own generated reports
CREATE POLICY "Users can read own generated reports"
ON generated_reports FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own generated reports
CREATE POLICY "Users can insert own generated reports"
ON generated_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Agent Nudges Policies
-- Users can read their own nudges
CREATE POLICY "Users can read own nudges"
ON agent_nudges FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own nudges (to dismiss them)
CREATE POLICY "Users can update own nudges"
ON agent_nudges FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Templates Policies
-- Users can read their own email templates
CREATE POLICY "Users can read own email templates"
ON email_templates FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own email templates
CREATE POLICY "Users can insert own email templates"
ON email_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own email templates
CREATE POLICY "Users can update own email templates"
ON email_templates FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own email templates
CREATE POLICY "Users can delete own email templates"
ON email_templates FOR DELETE
USING (auth.uid() = user_id);

-- Draft Emails Policies
-- Users can read their own draft emails
CREATE POLICY "Users can read own draft emails"
ON draft_emails FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own draft emails
CREATE POLICY "Users can insert own draft emails"
ON draft_emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft emails
CREATE POLICY "Users can update own draft emails"
ON draft_emails FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own draft emails
CREATE POLICY "Users can delete own draft emails"
ON draft_emails FOR DELETE
USING (auth.uid() = user_id);
