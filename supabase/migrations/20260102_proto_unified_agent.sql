-- Migration: Transform multi-agent platform to Proto unified agent
-- This migration creates the new Proto memory and workspace tables

-- Single agent memory table (replaces per-agent tables)
CREATE TABLE IF NOT EXISTS proto_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- 'business_context', 'preference', 'relationship', 'process', 'goal'
  category TEXT, -- 'team', 'customer', 'financial', 'operational'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  importance INT DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proto_memory_user_type ON proto_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_proto_memory_user_category ON proto_memory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_proto_memory_importance ON proto_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_proto_memory_last_accessed ON proto_memory(last_accessed DESC);

-- Conversation threads table
CREATE TABLE IF NOT EXISTS proto_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  title TEXT, -- Auto-generated summary
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INT DEFAULT 0,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proto_conversations_user ON proto_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_proto_conversations_thread ON proto_conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_proto_conversations_last_message ON proto_conversations(last_message_at DESC);

-- Workspace table for whiteboard and collaborative features
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'whiteboard', 'task_board', 'document_review'
  name TEXT NOT NULL,
  data JSONB NOT NULL, -- Stores canvas state, sticky notes, etc.
  collaborators UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);
CREATE INDEX IF NOT EXISTS idx_workspaces_collaborators ON workspaces USING GIN(collaborators);

-- Add onboarding_completed flag to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add Proto-specific fields to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'proto_context'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN proto_context JSONB;
  END IF;
END $$;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_proto_memory_updated_at ON proto_memory;
CREATE TRIGGER update_proto_memory_updated_at
  BEFORE UPDATE ON proto_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment access_count when memory is accessed
CREATE OR REPLACE FUNCTION increment_memory_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_count = OLD.access_count + 1;
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migration comment
COMMENT ON TABLE proto_memory IS 'Unified memory storage for Proto adaptive agent';
COMMENT ON TABLE proto_conversations IS 'Conversation threads with Proto';
COMMENT ON TABLE workspaces IS 'Collaborative workspaces for Proto features';
