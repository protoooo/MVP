-- Database schema for Compliance Analysis Tool
-- Run this in Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- ANALYSIS SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('qa', 'image', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Input metadata (JSON)
  input_metadata JSONB DEFAULT '{}',
  
  -- Output summary (JSON)
  output_summary JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_type ON analysis_sessions(type);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('image', 'video')),
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Link to analysis session
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ============================================================================
-- DOCUMENTS TABLE (for compliance Q&A)
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- document source/reference
  chunk TEXT NOT NULL, -- document chunk/content
  embedding vector(1024), -- Cohere Embed 4.0 uses 1024 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search documents using vector similarity
CREATE OR REPLACE FUNCTION match_compliance_documents(
  query_embedding vector(1024),
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  chunk TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.source,
    documents.chunk,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) >= match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ language 'plpgsql';

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Service role can manage all tables
CREATE POLICY "Service role can manage analysis_sessions"
  ON analysis_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payments"
  ON payments
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage documents"
  ON documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON analysis_sessions TO service_role;
GRANT ALL ON payments TO service_role;
GRANT ALL ON documents TO service_role;
GRANT EXECUTE ON FUNCTION match_compliance_documents TO service_role;
