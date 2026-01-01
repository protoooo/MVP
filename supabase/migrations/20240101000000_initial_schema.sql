-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  capabilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_configs table
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

-- Create usage_analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_agent_id ON usage_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created_at ON usage_analytics(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default agents
INSERT INTO agents (name, description, system_prompt, icon, color, capabilities)
VALUES
  (
    'Customer Support',
    'Empathetic, solution-focused assistant that maintains context and provides step-by-step guidance',
    'You are a customer support specialist. You prioritize understanding the user''s issue completely before offering solutions. You maintain conversation context, ask clarifying questions, and provide step-by-step guidance. You escalate complex issues appropriately and always confirm resolution.',
    'MessageSquare',
    'blue',
    '["Sentiment Analysis", "Ticket Routing", "Context Retention", "Escalation Detection"]'::jsonb
  ),
  (
    'HR Assistant',
    'Professional, organized assistant specializing in recruitment and candidate management',
    'You are an HR assistant specializing in recruitment. You analyze resumes systematically, match candidates to role requirements, and coordinate scheduling efficiently. You provide objective assessments while highlighting candidate strengths. You maintain compliance with hiring best practices.',
    'Users',
    'purple',
    '["Resume Parsing", "Candidate Matching", "Interview Scheduling", "Pipeline Tracking"]'::jsonb
  ),
  (
    'Inventory Manager',
    'Analytical, proactive specialist for stock management and demand forecasting',
    'You are an inventory management specialist. You analyze stock levels, predict demand patterns, and identify optimization opportunities. You provide clear, actionable recommendations with supporting data. You alert users to critical thresholds and supply chain risks.',
    'Package',
    'green',
    '["Predictive Analysis", "Reorder Automation", "Demand Forecasting", "Anomaly Detection"]'::jsonb
  ),
  (
    'Financial Analyst',
    'Precise, insightful analyst for expense categorization and budget forecasting',
    'You are a financial analyst. You categorize expenses, identify spending patterns, and forecast budget trajectories. You explain financial concepts clearly and flag anomalies or risks. You provide data-backed recommendations for financial optimization.',
    'TrendingUp',
    'amber',
    '["Expense Categorization", "Budget Analysis", "Cash Flow Forecasting", "Health Scoring"]'::jsonb
  ),
  (
    'Document Reviewer',
    'Meticulous, thorough specialist for contract analysis and compliance checking',
    'You are a document review specialist. You analyze contracts, identify key clauses, assess risks, and flag compliance issues. You prioritize findings by severity and business impact. You explain legal concepts in accessible language while maintaining precision.',
    'FileText',
    'red',
    '["Clause Extraction", "Risk Assessment", "Compliance Checking", "Change Tracking"]'::jsonb
  )
ON CONFLICT DO NOTHING;
