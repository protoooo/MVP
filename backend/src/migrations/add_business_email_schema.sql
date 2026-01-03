-- Migration: Add Business Email System Schema
-- Created: 2026-01-03

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

CREATE INDEX IF NOT EXISTS email_accounts_user_id_idx ON email_accounts(user_id);

-- Email Threads
CREATE TABLE IF NOT EXISTS email_threads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(500),
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_threads_user_id_idx ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS email_threads_last_message_at_idx ON email_threads(last_message_at DESC);

-- Emails with pgvector for semantic search
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  thread_id INTEGER REFERENCES email_threads(id) ON DELETE CASCADE,
  email_account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  body_embedding vector(1536),
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  received_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emails_user_id_idx ON emails(user_id);
CREATE INDEX IF NOT EXISTS emails_thread_id_idx ON emails(thread_id);
CREATE INDEX IF NOT EXISTS emails_is_read_idx ON emails(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails(received_at DESC);

-- Vector search index for emails
CREATE INDEX IF NOT EXISTS emails_body_embedding_idx 
ON emails USING ivfflat (body_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_templates_user_id_idx ON email_templates(user_id);
