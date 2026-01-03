-- Migration: Add Invoicing & Payments Schema
-- Created: 2026-01-03

-- Customers (for invoicing)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_stripe_customer_id_idx ON customers(stripe_customer_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending, paid, cancelled
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  due_date DATE,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at DESC);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed, cancelled
  payment_method VARCHAR(50),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
