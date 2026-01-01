-- Database Schema for Document-Driven Agent Platform
-- This file defines the tables needed for agent memory, document embeddings, and audit trails

-- ========================================
-- EXISTING TABLES (for reference)
-- ========================================

-- Table: user_profiles
-- Stores user/business profile information
-- Columns: id, business_name, industry, created_at, etc.

-- Table: business_documents
-- Stores document metadata
-- Columns: id, user_id, document_name, document_type, file_url, file_size, mime_type, processed, uploaded_at

-- Table: agent_tasks
-- Stores tasks created by agents
-- Columns: id, user_id, agent_type, task_description, status, created_at, etc.

-- Table: agent_nudges
-- Stores agent suggestions/notifications
-- Columns: id, user_id, message, dismissed, created_at

-- ========================================
-- NEW TABLES FOR AGENT MEMORY SYSTEM
-- ========================================

-- Table: document_embeddings
-- Stores vector embeddings for semantic search across documents
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1024), -- Cohere Embed v3 produces 1024-dimensional vectors
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_doc_chunk UNIQUE (document_id, chunk_index)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector 
  ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_document_embeddings_user 
  ON document_embeddings(user_id);

-- Table: agent_memory
-- Stores long-term memory for each agent type per user
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL, -- 'operations', 'customer-support', 'hr', etc.
  memory_key VARCHAR(255) NOT NULL, -- Unique identifier for this memory
  memory_value JSONB NOT NULL, -- Flexible storage for any data structure
  category VARCHAR(100), -- For organizing memories (e.g., 'business_context', 'preferences', 'insights')
  importance INTEGER DEFAULT 5, -- 1-10 scale for memory importance
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique memory keys per agent per user
  CONSTRAINT unique_agent_memory UNIQUE (user_id, agent_type, memory_key)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_agent 
  ON agent_memory(user_id, agent_type);

CREATE INDEX IF NOT EXISTS idx_agent_memory_category 
  ON agent_memory(category);

CREATE INDEX IF NOT EXISTS idx_agent_memory_importance 
  ON agent_memory(importance DESC);

-- Table: agent_run_logs
-- Comprehensive audit trail of all agent executions
CREATE TABLE IF NOT EXISTS agent_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  run_type VARCHAR(50) NOT NULL, -- 'chat', 'autonomous', 'scheduled'
  
  -- Input/Output tracking
  user_input TEXT,
  agent_output TEXT,
  
  -- Document usage tracking
  documents_used JSONB DEFAULT '[]', -- Array of document IDs and names used
  documents_missing JSONB DEFAULT '[]', -- Array of document types suggested
  
  -- Execution details
  tools_called JSONB DEFAULT '[]', -- Array of tools used during execution
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  
  -- Quality metrics
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  user_feedback INTEGER, -- 1-5 rating from user (nullable)
  
  -- Metadata
  session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics and queries
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_user 
  ON agent_run_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_run_logs_agent_type 
  ON agent_run_logs(agent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_run_logs_session 
  ON agent_run_logs(session_id);

-- Table: document_insights
-- Stores extracted insights and analysis from documents
CREATE TABLE IF NOT EXISTS document_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES business_documents(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL, -- Which agent extracted this insight
  
  -- Insight content
  insight_type VARCHAR(100) NOT NULL, -- 'risk', 'obligation', 'pattern', 'contradiction', etc.
  insight_title VARCHAR(255) NOT NULL,
  insight_description TEXT NOT NULL,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Context
  related_documents JSONB DEFAULT '[]', -- Array of related document IDs
  action_items JSONB DEFAULT '[]', -- Array of suggested actions
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'dismissed'
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for insight queries
CREATE INDEX IF NOT EXISTS idx_document_insights_user 
  ON document_insights(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_insights_document 
  ON document_insights(document_id);

CREATE INDEX IF NOT EXISTS idx_document_insights_type 
  ON document_insights(insight_type);

-- Table: cross_document_findings
-- Stores findings that span multiple documents (contradictions, patterns, etc.)
CREATE TABLE IF NOT EXISTS cross_document_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Finding details
  finding_type VARCHAR(100) NOT NULL, -- 'contradiction', 'pattern', 'gap', 'alignment'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Document references
  document_ids JSONB NOT NULL, -- Array of document IDs involved
  document_excerpts JSONB DEFAULT '{}', -- Key excerpts from each document
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  suggested_actions JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  reviewed_by_user BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cross_doc_findings_user 
  ON cross_document_findings(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cross_doc_findings_type 
  ON cross_document_findings(finding_type);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all new tables
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_document_findings ENABLE ROW LEVEL SECURITY;

-- Policies for document_embeddings
CREATE POLICY "Users can view their own document embeddings"
  ON document_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document embeddings"
  ON document_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document embeddings"
  ON document_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for agent_memory
CREATE POLICY "Users can view their own agent memory"
  ON agent_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent memory"
  ON agent_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent memory"
  ON agent_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent memory"
  ON agent_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for agent_run_logs
CREATE POLICY "Users can view their own agent run logs"
  ON agent_run_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent run logs"
  ON agent_run_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for document_insights
CREATE POLICY "Users can view their own document insights"
  ON document_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document insights"
  ON document_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document insights"
  ON document_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document insights"
  ON document_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for cross_document_findings
CREATE POLICY "Users can view their own cross-document findings"
  ON cross_document_findings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cross-document findings"
  ON cross_document_findings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cross-document findings"
  ON cross_document_findings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cross-document findings"
  ON cross_document_findings FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_insights_updated_at
  BEFORE UPDATE ON document_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_doc_findings_updated_at
  BEFORE UPDATE ON cross_document_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_accessed on agent_memory
CREATE OR REPLACE FUNCTION update_memory_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_memory_last_accessed
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  WHEN (OLD.memory_value IS DISTINCT FROM NEW.memory_value)
  EXECUTE FUNCTION update_memory_last_accessed();

-- ========================================
-- HELPER VIEWS
-- ========================================

-- View: agent_activity_summary
-- Provides a summary of agent activity per user
CREATE OR REPLACE VIEW agent_activity_summary AS
SELECT 
  user_id,
  agent_type,
  COUNT(*) as total_runs,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  AVG(execution_time_ms) as avg_execution_time_ms,
  SUM(tokens_used) as total_tokens_used,
  AVG(confidence_score) as avg_confidence_score,
  AVG(user_feedback) as avg_user_feedback,
  MAX(created_at) as last_run_at
FROM agent_run_logs
GROUP BY user_id, agent_type;

-- View: document_utilization
-- Shows how documents are being used by agents
CREATE OR REPLACE VIEW document_utilization AS
SELECT 
  bd.id as document_id,
  bd.user_id,
  bd.document_name,
  bd.document_type,
  COUNT(DISTINCT arl.id) as times_referenced,
  MAX(arl.created_at) as last_referenced_at,
  COUNT(DISTINCT di.id) as insights_extracted
FROM business_documents bd
LEFT JOIN agent_run_logs arl ON (arl.documents_used)::jsonb ? bd.id::text
LEFT JOIN document_insights di ON di.document_id = bd.id
GROUP BY bd.id, bd.user_id, bd.document_name, bd.document_type;

-- ========================================
-- NOTES FOR DEVELOPERS
-- ========================================

/*
SETUP INSTRUCTIONS:

1. Enable pgvector extension:
   CREATE EXTENSION IF NOT EXISTS vector;

2. Run this schema file in your Supabase SQL editor

3. Verify tables were created:
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';

4. Test RLS policies by querying as a regular user (not service role)

USAGE PATTERNS:

1. Document Embeddings:
   - When a document is uploaded, chunk it and create embeddings
   - Store each chunk with its embedding for semantic search
   - Use cosine similarity search to find relevant chunks

2. Agent Memory:
   - Store business context, user preferences, learned patterns
   - Update importance scores based on access frequency
   - Clean up low-importance, rarely accessed memories periodically

3. Agent Run Logs:
   - Log every agent interaction for audit and improvement
   - Track which documents were used vs. which were missing
   - Analyze confidence scores to improve agent performance

4. Document Insights:
   - Extract structured insights during document analysis
   - Track action items and their resolution status
   - Surface unresolved high-severity insights to users

5. Cross-Document Findings:
   - Detect patterns, contradictions, gaps across documents
   - Prioritize by severity for user review
   - Update status as issues are resolved

MAINTENANCE:

1. Periodically clean up old run logs (>90 days)
2. Archive resolved insights (>30 days resolved)
3. Rebuild vector indexes if search performance degrades
4. Monitor memory growth and implement cleanup policies
*/
