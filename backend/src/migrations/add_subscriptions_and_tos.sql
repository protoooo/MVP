-- Add subscription and terms of service fields
-- This migration adds the necessary tables and columns for Stripe subscriptions and ToS tracking

-- Add ToS acceptance to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_version VARCHAR(50);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
  plan_name VARCHAR(100) DEFAULT 'Small Business Plan',
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

-- Create webhook events table for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  payload JSONB
);

-- Create index for webhook events
CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_id_idx ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx ON stripe_webhook_events(event_type);

-- Add audit log table for document operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_resource_type_idx ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- Add password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);
