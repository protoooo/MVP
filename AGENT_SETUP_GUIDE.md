# Document-Driven Agent Platform Setup Guide

This guide explains how to set up and use the document-driven agent platform with agent memory, document embeddings, and audit trails.

## Table of Contents
1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Environment Variables](#environment-variables)
4. [Document Processing](#document-processing)
5. [Agent Memory System](#agent-memory-system)
6. [Usage Examples](#usage-examples)
7. [Maintenance](#maintenance)

## Overview

The platform now implements a comprehensive document-driven approach where:
- **Documents are the source of truth** - Agents only use uploaded documents
- **No live integrations** - No connections to Stripe, email, POS, or other systems
- **Agent memory** - Each agent maintains long-term memory specific to each user
- **Document embeddings** - Semantic search across all uploaded documents
- **Audit trails** - Complete logs of all agent interactions

### Key Features

1. **Operations Intelligence Agent** (NEW)
   - Daily Priority Briefs
   - Cross-Document Issue Detection
   - Auto Task Suggestions
   - Weekly Business Health Summaries
   - What's Missing Detector

2. **Enhanced Existing Agents**
   - Customer Support: Policy-based responses
   - HR Assistant: Policy Q&A and compliance
   - Inventory Manager: Document-driven insights
   - Financial Analyst: Report-based analysis
   - Document Reviewer: Risk identification

## Database Setup

### Prerequisites

- Supabase project with PostgreSQL
- pgvector extension enabled

### Step 1: Enable pgvector Extension

Run in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 2: Run Schema Migration

Execute the entire `database-schema.sql` file in your Supabase SQL Editor. This creates:

- `document_embeddings` - Vector embeddings for semantic search
- `agent_memory` - Long-term memory for each agent
- `agent_run_logs` - Audit trail of all agent executions
- `document_insights` - Extracted insights from documents
- `cross_document_findings` - Findings spanning multiple documents

### Step 3: Create RPC Function for Semantic Search

```sql
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
```

### Step 4: Verify Tables

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see all the new tables listed.

### Step 5: Test Row Level Security

Query a table as a regular user (not using service role):

```sql
SELECT * FROM agent_memory LIMIT 1;
```

Should only return data for the authenticated user.

## Environment Variables

Add these to your `.env.local` file:

```env
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
COHERE_API_KEY=your_cohere_key

# Stripe (for billing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Document Processing

### How Documents are Processed

1. **Upload** - User uploads document via `/dashboard/uploads`
2. **Storage** - File saved to Supabase Storage bucket `business-documents`
3. **Metadata** - Document info saved to `business_documents` table
4. **Chunking** - Document text split into ~500 token chunks with overlap
5. **Embedding** - Each chunk gets a 1024-dim vector from Cohere Embed v3
6. **Storage** - Chunks and embeddings saved to `document_embeddings` table

### Implementing Document Processing

Add to your document upload route (`app/api/document/upload/route.ts`):

```typescript
import { processDocument } from "@/lib/document-processing";

// After saving document to database
const documentText = await extractTextFromFile(file); // Your text extraction logic
await processDocument(userId, documentId, documentText, {
  document_type: documentType,
  uploaded_at: new Date().toISOString()
});
```

### Semantic Search

Agents automatically search documents when responding:

```typescript
import { getRelevantContext } from "@/lib/document-processing";

const { context, documentsUsed } = await getRelevantContext(
  userId,
  userQuery,
  agentType,
  5 // max chunks
);

// Use context in agent prompt
const prompt = `Based on these documents:\n\n${context}\n\nUser question: ${userQuery}`;
```

## Agent Memory System

### Memory Structure

Each agent can store memories in categories:

```typescript
import { storeAgentMemory, getAgentMemories } from "@/lib/agent-memory";

// Store business context
await storeAgentMemory(
  userId,
  "operations",
  "business_industry",
  { industry: "restaurant", type: "bakery", size: "small" },
  "business_context",
  9 // high importance
);

// Store user preferences
await storeAgentMemory(
  userId,
  "customer-support",
  "tone_preference",
  { tone: "friendly", formality: "casual" },
  "preferences",
  7
);

// Store learned patterns
await storeAgentMemory(
  userId,
  "financial",
  "expense_patterns",
  { 
    food_cost_avg: 0.32,
    labor_cost_avg: 0.28,
    peak_months: ["Nov", "Dec"]
  },
  "insights",
  8
);
```

### Memory Categories

- `business_context` - Industry, size, location, structure
- `preferences` - User preferences, communication style
- `insights` - Learned patterns, trends, observations
- `policy_rules` - Extracted policy requirements
- `historical_data` - Time-series patterns

### Retrieving Memories

```typescript
// Get all memories for an agent
const memories = await getAgentMemories(userId, "operations");

// Get memories by category
const contextMemories = await getAgentMemories(userId, "hr", "business_context");

// Get specific memory
const preference = await getAgentMemory(userId, "customer-support", "tone_preference");
```

## Usage Examples

### Example 1: Operations Intelligence Daily Brief

```typescript
// In agent execution
import { getAgentMemories } from "@/lib/agent-memory";
import { getRelevantContext } from "@/lib/document-processing";
import { logAgentRun } from "@/lib/agent-memory";

const startTime = Date.now();

// Get business context from memory
const memories = await getAgentMemories(userId, "operations", "business_context");

// Get relevant documents
const { context, documentsUsed } = await getRelevantContext(
  userId,
  "What are the current priorities and issues?",
  "operations",
  10
);

// Generate brief using Cohere
const brief = await generateBrief(context, memories);

// Log the execution
await logAgentRun({
  user_id: userId,
  agent_type: "operations",
  run_type: "autonomous",
  user_input: "Daily brief requested",
  agent_output: brief,
  documents_used: documentsUsed,
  execution_time_ms: Date.now() - startTime,
  confidence_score: 0.85
});
```

### Example 2: Document Insights Extraction

```typescript
import { storeDocumentInsight } from "@/lib/agent-memory";

// When analyzing a document
const risks = identifyRisks(documentContent); // Your analysis logic

for (const risk of risks) {
  await storeDocumentInsight({
    user_id: userId,
    document_id: documentId,
    agent_type: "document",
    insight_type: "risk",
    insight_title: risk.title,
    insight_description: risk.description,
    severity: risk.severity,
    action_items: risk.actions
  });
}
```

### Example 3: Cross-Document Contradiction Detection

```typescript
import { storeCrossDocumentFinding } from "@/lib/agent-memory";

// When detecting contradictions
await storeCrossDocumentFinding({
  user_id: userId,
  finding_type: "contradiction",
  title: "Overtime policy mismatch",
  description: "Employee handbook says overtime starts at 40hrs, but payroll policy says 37.5hrs",
  severity: "high",
  document_ids: [handbookId, payrollPolicyId],
  document_excerpts: {
    [handbookId]: "Overtime is paid for hours worked over 40 per week",
    [payrollPolicyId]: "Employees are eligible for overtime after 37.5 hours"
  },
  recommendations: [
    "Clarify which policy is correct",
    "Update both documents to match",
    "Communicate change to all employees"
  ]
});
```

## Maintenance

### Periodic Cleanup

#### 1. Clean Old Run Logs (recommended: monthly)

```sql
-- Delete logs older than 90 days
DELETE FROM agent_run_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

#### 2. Archive Resolved Insights (recommended: monthly)

```sql
-- Archive insights resolved more than 30 days ago
-- Option 1: Delete them
DELETE FROM document_insights
WHERE status = 'resolved'
  AND resolved_at < NOW() - INTERVAL '30 days';

-- Option 2: Export to backup table first
CREATE TABLE IF NOT EXISTS document_insights_archive AS
SELECT * FROM document_insights WHERE 1=0;

INSERT INTO document_insights_archive
SELECT * FROM document_insights
WHERE status = 'resolved'
  AND resolved_at < NOW() - INTERVAL '30 days';
```

#### 3. Clean Low-Importance Memories (recommended: quarterly)

```sql
-- Delete low-importance memories not accessed in 60 days
DELETE FROM agent_memory
WHERE importance <= 3
  AND last_accessed < NOW() - INTERVAL '60 days';
```

#### 4. Rebuild Vector Indexes (if search performance degrades)

```sql
-- Drop and recreate the index
DROP INDEX IF EXISTS idx_document_embeddings_vector;

CREATE INDEX idx_document_embeddings_vector 
  ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Monitoring

#### Check Document Processing Status

```sql
SELECT 
  document_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN processed THEN 0 ELSE 1 END) as pending
FROM business_documents
GROUP BY document_type;
```

#### Agent Activity Summary

```sql
SELECT * FROM agent_activity_summary
ORDER BY total_runs DESC;
```

#### Document Utilization

```sql
SELECT * FROM document_utilization
WHERE times_referenced > 0
ORDER BY times_referenced DESC;
```

#### Unresolved High-Severity Issues

```sql
SELECT 
  insight_type,
  COUNT(*) as count
FROM document_insights
WHERE status = 'active'
  AND severity IN ('high', 'critical')
GROUP BY insight_type
ORDER BY count DESC;
```

## Troubleshooting

### Documents not being processed

1. Check if pgvector is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
2. Verify COHERE_API_KEY is set correctly
3. Check logs for embedding generation errors
4. Ensure document text extraction is working

### Search returning no results

1. Verify embeddings exist: `SELECT COUNT(*) FROM document_embeddings WHERE user_id = 'xxx';`
2. Check RPC function exists: `SELECT * FROM pg_proc WHERE proname = 'search_document_embeddings';`
3. Lower match_threshold in search (try 0.3 instead of 0.5)
4. Verify vector index exists

### Memory not persisting

1. Check RLS policies are correct
2. Verify user_id matches authenticated user
3. Check for unique constraint violations
4. Ensure SUPABASE_SERVICE_ROLE_KEY is set for server-side operations

## Best Practices

1. **Document Organization**
   - Use clear, descriptive document names
   - Set appropriate document_type for better filtering
   - Upload documents in logical batches

2. **Memory Management**
   - Set importance scores based on how critical the information is
   - Use consistent category names across agents
   - Clean up low-importance, old memories regularly

3. **Agent Prompts**
   - Always instruct agents to cite which documents they used
   - Explicitly tell agents what to do when data is missing
   - Require agents to suggest specific documents to upload

4. **Performance**
   - Keep chunk sizes around 500 tokens for optimal search
   - Limit search results to 5-10 most relevant chunks
   - Use document_type filtering when possible

5. **Security**
   - Never expose service role key to client
   - Rely on RLS policies for data isolation
   - Log all agent interactions for audit purposes

## Next Steps

1. Set up automated document processing on upload
2. Create scheduled jobs for daily priority briefs
3. Build dashboard for insights and findings
4. Implement user feedback collection
5. Add analytics for agent performance

For questions or issues, refer to the main README.md or check the Supabase documentation.
