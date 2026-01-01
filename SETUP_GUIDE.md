# Setup Guide

This guide will help you set up the Business Workspace application from scratch.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Cohere API account (free trial available)
- A Stripe account (for payments)

## Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd MVP
npm install
```

## Step 2: Set Up Supabase

### Create a New Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and API keys from Project Settings → API

### Enable pgvector Extension

Run this SQL in the Supabase SQL Editor:

```sql
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;
```

### Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  business_name TEXT,
  subscription_status TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  setup_completed BOOLEAN DEFAULT FALSE,
  total_hours_saved NUMERIC DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_emails_drafted INTEGER DEFAULT 0,
  total_reports_generated INTEGER DEFAULT 0,
  total_documents_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business documents table
CREATE TABLE business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document embeddings table (for semantic search)
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES business_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1024), -- Cohere embed-english-v3.0 uses 1024 dimensions
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent tasks table
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Value tracking table
CREATE TABLE value_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  time_saved_minutes INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_type ON business_documents(user_id, document_type);
CREATE INDEX idx_embeddings_user ON document_embeddings(user_id);
CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE INDEX idx_tasks_workspace ON agent_tasks(user_id, agent_type);
CREATE INDEX idx_value_events_user ON value_events(user_id);

-- Create RPC function for semantic search
CREATE OR REPLACE FUNCTION search_document_embeddings(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_text,
    de.metadata,
    1 - (de.embedding <=> query_embedding) as similarity
  FROM document_embeddings de
  WHERE de.user_id = filter_user_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create RPC function for value tracking
CREATE OR REPLACE FUNCTION track_value_event(
  p_user_id uuid,
  p_event_type text,
  p_agent_type text,
  p_time_saved_minutes int,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert value event
  INSERT INTO value_events (user_id, event_type, agent_type, time_saved_minutes, description)
  VALUES (p_user_id, p_event_type, p_agent_type, p_time_saved_minutes, p_description);
  
  -- Update user profile counters
  UPDATE user_profiles
  SET 
    total_hours_saved = total_hours_saved + (p_time_saved_minutes / 60.0),
    total_tasks_completed = total_tasks_completed + 1,
    total_emails_drafted = CASE WHEN p_event_type = 'email_drafted' THEN total_emails_drafted + 1 ELSE total_emails_drafted END,
    total_reports_generated = CASE WHEN p_event_type LIKE '%report%' THEN total_reports_generated + 1 ELSE total_reports_generated END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
```

### Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `business-documents`
3. Set it to **Public** (we'll secure with RLS policies)
4. Add RLS policy:

```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Step 3: Get API Keys

### Cohere API Key

1. Go to [dashboard.cohere.com](https://dashboard.cohere.com)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `co_...`)

### Stripe Setup

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get your API keys from Developers → API keys
3. Create a product:
   - Name: "Business Workspace - Base Plan"
   - Price: $25/month (recurring)
   - Copy the Price ID (starts with `price_...`)
4. Create another product:
   - Name: "Business Workspace - Team Member"
   - Price: $10/month (recurring)
   - Copy the Price ID

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Cohere AI
COHERE_API_KEY=your_cohere_api_key_here

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (get this after setting up webhooks)

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Set Up Stripe Webhooks

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook signing secret (starts with `whsec_...`)
4. Add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7: Test the Application

1. Sign up for a new account
2. Complete the onboarding
3. Upload a test document (PDF, DOCX, or CSV)
4. Wait for processing to complete
5. Try asking an agent a question related to your document
6. Verify the agent references the document in its response

## Production Deployment

### Environment Variables

Set all the same environment variables on your production platform (Railway, Vercel, etc.)

### Stripe Webhooks

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add an endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in your production environment

### Database Indexes

For production, consider adding these additional indexes:

```sql
CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_documents_processed ON business_documents(user_id, processed);
```

## Troubleshooting

### "No Supabase URL" Error
- Make sure `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL`
- Restart the dev server after adding env variables

### Document Processing Fails
- Check that pgvector extension is enabled
- Verify `COHERE_API_KEY` is set correctly
- Check Supabase Storage bucket exists and is accessible

### Stripe Webhook Errors
- Ensure webhook secret matches between Stripe and your env
- Check that the webhook URL is publicly accessible
- Verify all required events are selected in Stripe dashboard

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Cohere Docs: https://docs.cohere.com
- Stripe Docs: https://stripe.com/docs
- Next.js Docs: https://nextjs.org/docs
