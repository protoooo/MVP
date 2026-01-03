-- Migration: Add Customer Hub (CRM) Schema
-- Created: 2026-01-03

-- Customer Interactions
CREATE TABLE IF NOT EXISTS customer_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- email, call, meeting, note
  subject VARCHAR(500),
  description TEXT,
  interaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_interactions_user_id_idx ON customer_interactions(user_id);
CREATE INDEX IF NOT EXISTS customer_interactions_customer_id_idx ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS customer_interactions_date_idx ON customer_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS customer_interactions_type_idx ON customer_interactions(interaction_type);
