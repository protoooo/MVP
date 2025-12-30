# MI Health Inspection - Database Setup Guide

This guide provides all SQL scripts needed to set up the MI Health Inspection database in Supabase.

## Prerequisites

- Supabase project created
- Access to Supabase SQL Editor

## Step 1: Run the Main Schema

Copy and paste the contents of `schema-compliance.sql` into your Supabase SQL Editor and execute.

This creates:
- `analysis_sessions` table with passcode support
- `payments` table for Stripe payments
- `documents` table for Michigan food safety regulations
- All necessary indexes and functions

## Step 2: Enable Row Level Security (RLS)

The schema automatically enables RLS. No additional configuration needed.

## Step 3: Create Storage Buckets

Run this in Supabase SQL Editor to create storage buckets:

```sql
-- Create storage buckets for uploaded files and generated PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('analysis-uploads', 'analysis-uploads', false),
  ('analysis-reports', 'analysis-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to manage uploads bucket
CREATE POLICY "Service role can manage uploads"
  ON storage.objects FOR ALL
  USING (bucket_id = 'analysis-uploads' AND auth.role() = 'service_role');

-- Allow public read access to reports bucket
CREATE POLICY "Public can read reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'analysis-reports');

-- Service role can manage reports bucket  
CREATE POLICY "Service role can manage reports"
  ON storage.objects FOR ALL
  USING (bucket_id = 'analysis-reports' AND auth.role() = 'service_role');
```

## Step 4: Verify Installation

Run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('analysis_sessions', 'payments', 'documents')
ORDER BY table_name;
```

You should see all 3 tables listed.

## Step 5: Test Passcode Uniqueness

Run this to verify passcode constraint:

```sql
-- This should succeed
INSERT INTO analysis_sessions (passcode, type) 
VALUES ('12345', 'image');

-- This should fail with unique constraint error
INSERT INTO analysis_sessions (passcode, type) 
VALUES ('12345', 'video');

-- Clean up test data
DELETE FROM analysis_sessions WHERE passcode = '12345';
```

## Step 6: Ingest Michigan Food Safety Documents

After the database is set up, run the document ingestion script:

```bash
# Place Michigan food safety regulation PDFs in public/documents/
npm run ingest
```

This will:
1. Parse PDF documents
2. Chunk content into searchable pieces
3. Generate embeddings using Cohere Embed 4.0
4. Store in the `documents` table

## Sample Queries

### Check analysis sessions by passcode:
```sql
SELECT id, passcode, type, status, upload_completed, created_at
FROM analysis_sessions
WHERE passcode = '12345';
```

### Check payment status:
```sql
SELECT s.passcode, s.type, p.amount, p.status, p.created_at
FROM analysis_sessions s
LEFT JOIN payments p ON p.session_id = s.id
WHERE s.passcode = '12345';
```

### Search documents:
```sql
-- Note: You'll need to generate an embedding first using Cohere Embed 4.0
-- Then pass it to the match_compliance_documents function
SELECT * FROM match_compliance_documents(
  '[your-embedding-vector]'::vector(1024),
  0.5,  -- similarity threshold
  10    -- number of results
);
```

### Count documents by source:
```sql
SELECT 
  metadata->>'source' as source,
  COUNT(*) as chunk_count
FROM documents
GROUP BY metadata->>'source'
ORDER BY chunk_count DESC;
```

## Troubleshooting

### pgvector extension not found
```sql
-- Run this first
CREATE EXTENSION IF NOT EXISTS vector;
```

### RLS preventing access
```sql
-- Verify RLS policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('analysis_sessions', 'payments', 'documents');
```

### Storage buckets not working
```sql
-- Check bucket creation
SELECT id, name, public FROM storage.buckets;

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

## Next Steps

1. Update `.env.local` with Supabase credentials
2. Run document ingestion: `npm run ingest`
3. Test the application locally: `npm run dev`
4. Configure Stripe webhook in production

## Support

For database issues:
- Check Supabase logs in dashboard
- Review table structure: `\d+ analysis_sessions` in SQL editor
- Verify indexes: `\di` in SQL editor
