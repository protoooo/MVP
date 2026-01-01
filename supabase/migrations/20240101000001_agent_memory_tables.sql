-- Agent Memory Tables
-- Each agent gets their own memory and data storage

-- Agent Memory Table (for long-term memory across conversations)
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  category TEXT,
  importance INTEGER DEFAULT 5, -- 1-10 scale
  embedding VECTOR(1024), -- For semantic search using pgvector
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Customer Support Agent Tables
CREATE TABLE IF NOT EXISTS cs_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT,
  sentiment_score FLOAT,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS cs_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  embedding VECTOR(1024),
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR Assistant Agent Tables
CREATE TABLE IF NOT EXISTS hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_text TEXT,
  resume_url TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  status TEXT CHECK (status IN ('new', 'screening', 'interviewing', 'offered', 'hired', 'rejected')) DEFAULT 'new',
  embedding VECTOR(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '[]'::jsonb,
  status TEXT CHECK (status IN ('open', 'closed', 'on_hold')) DEFAULT 'open',
  location TEXT,
  salary_range TEXT,
  embedding VECTOR(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES hr_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES hr_jobs(id) ON DELETE CASCADE,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  interviewer TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')) DEFAULT 'scheduled',
  notes TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_candidate_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES hr_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES hr_jobs(id) ON DELETE CASCADE,
  match_score FLOAT,
  strengths TEXT[],
  gaps TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Manager Agent Tables
CREATE TABLE IF NOT EXISTS inv_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10, 2),
  supplier_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES inv_products(id) ON DELETE CASCADE,
  movement_type TEXT CHECK (movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_reorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES inv_products(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  quantity INTEGER NOT NULL,
  supplier_id TEXT,
  status TEXT CHECK (status IN ('pending', 'ordered', 'received', 'cancelled')) DEFAULT 'pending',
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_delivery TIMESTAMP WITH TIME ZONE,
  received_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS inv_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES inv_products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_demand INTEGER,
  confidence_level FLOAT,
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Analyst Agent Tables
CREATE TABLE IF NOT EXISTS fin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT,
  subcategory TEXT,
  payment_method TEXT,
  vendor TEXT,
  status TEXT CHECK (status IN ('pending', 'cleared', 'reconciled')) DEFAULT 'cleared',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  period_type TEXT CHECK (period_type IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budgeted_amount DECIMAL(12, 2) NOT NULL,
  actual_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_cashflow_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_inflow DECIMAL(12, 2),
  predicted_outflow DECIMAL(12, 2),
  predicted_balance DECIMAL(12, 2),
  confidence_level FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fin_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES fin_transactions(id) ON DELETE CASCADE,
  anomaly_type TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  description TEXT,
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE
);

-- Document Reviewer Agent Tables
CREATE TABLE IF NOT EXISTS doc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT,
  file_url TEXT,
  file_size INTEGER,
  content_text TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')) DEFAULT 'pending',
  embedding VECTOR(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES doc_documents(id) ON DELETE CASCADE,
  clause_type TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  clause_number TEXT,
  page_number INTEGER,
  importance TEXT CHECK (importance IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES doc_documents(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  description TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id_1 UUID REFERENCES doc_documents(id) ON DELETE CASCADE,
  document_id_2 UUID REFERENCES doc_documents(id) ON DELETE CASCADE,
  changes JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_user ON agent_memory(agent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_category ON agent_memory(category);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(memory_key);

CREATE INDEX IF NOT EXISTS idx_cs_tickets_user ON cs_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_status ON cs_tickets(status);
CREATE INDEX IF NOT EXISTS idx_cs_knowledge_base_category ON cs_knowledge_base(category);

CREATE INDEX IF NOT EXISTS idx_hr_candidates_user ON hr_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_status ON hr_candidates(status);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_user ON hr_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_status ON hr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_hr_interviews_candidate ON hr_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_interviews_job ON hr_interviews(job_id);

CREATE INDEX IF NOT EXISTS idx_inv_products_user ON inv_products(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_products_sku ON inv_products(sku);
CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_product ON inv_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_reorders_product ON inv_reorders(product_id);

CREATE INDEX IF NOT EXISTS idx_fin_transactions_user ON fin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_transactions_date ON fin_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_transactions_category ON fin_transactions(category);
CREATE INDEX IF NOT EXISTS idx_fin_budgets_user ON fin_budgets(user_id);

CREATE INDEX IF NOT EXISTS idx_doc_documents_user ON doc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_type ON doc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_clauses_document ON doc_clauses(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_risk_assessments_document ON doc_risk_assessments(document_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_cs_tickets_updated_at BEFORE UPDATE ON cs_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cs_knowledge_base_updated_at BEFORE UPDATE ON cs_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_candidates_updated_at BEFORE UPDATE ON hr_candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_jobs_updated_at BEFORE UPDATE ON hr_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_interviews_updated_at BEFORE UPDATE ON hr_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inv_products_updated_at BEFORE UPDATE ON inv_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fin_transactions_updated_at BEFORE UPDATE ON fin_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fin_budgets_updated_at BEFORE UPDATE ON fin_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doc_documents_updated_at BEFORE UPDATE ON doc_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON agent_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
