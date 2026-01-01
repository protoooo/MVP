# API Documentation

## Overview
This document describes the API endpoints and integration points for the naiborhood platform.

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

## Authentication
All API endpoints require authentication via Supabase Auth. The frontend automatically includes auth tokens in requests.

## Endpoints

### Chat & Agent Interaction

#### POST `/api/chat`
Main endpoint for agent interactions.

**Request Body:**
```json
{
  "message": "string",
  "chatHistory": [
    {
      "role": "USER" | "CHATBOT",
      "message": "string"
    }
  ],
  "systemPrompt": "string",
  "agentType": "customer-support" | "hr" | "inventory" | "financial" | "document",
  "useAutonomous": boolean
}
```

**Response:**
```json
{
  "response": "string",
  "progressUpdates": ["string"],
  "autonomous": boolean
}
```

#### PUT `/api/chat`
Execute a specific task with an agent.

**Request Body:**
```json
{
  "taskDescription": "string",
  "systemPrompt": "string",
  "agentType": "customer-support" | "hr" | "inventory" | "financial" | "document"
}
```

**Response:**
```json
{
  "task": {
    "result": "string",
    "steps": ["string"]
  },
  "progressUpdates": ["string"]
}
```

### Document Management

Documents are managed through Supabase Storage and the `business_documents` table.

**Upload Flow:**
1. Upload file to Supabase Storage bucket `business-documents`
2. Insert metadata into `business_documents` table
3. Process document (extract text, generate embeddings)

**Example:**
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('business-documents')
  .upload(`${userId}/${timestamp}.${ext}`, file);

// Save metadata
await supabase
  .from('business_documents')
  .insert({
    user_id: userId,
    document_name: file.name,
    document_type: 'sales_data',
    file_url: publicUrl,
    file_size: file.size,
    mime_type: file.type
  });
```

### Stripe Integration

#### POST `/api/checkout`
Create a Stripe Checkout session.

**Request Body:**
```json
{
  "userId": "string",
  "priceId": "string"
}
```

**Response:**
```json
{
  "sessionId": "string",
  "url": "string"
}
```

#### POST `/api/webhooks/stripe`
Stripe webhook endpoint for subscription events.

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Reports

#### GET `/api/reports`
Get generated reports for a user.

**Query Parameters:**
- `type`: `daily_sales` | `weekly_staff` | `monthly_financial`
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "reports": [
    {
      "id": "string",
      "report_type": "string",
      "report_data": {},
      "generated_at": "string"
    }
  ]
}
```

#### POST `/api/reports/generate`
Manually generate a report.

**Request Body:**
```json
{
  "reportType": "daily_sales" | "weekly_staff" | "monthly_financial",
  "dateRange": {
    "start": "string",
    "end": "string"
  }
}
```

## Database Schema

### Core Tables

#### `user_profiles`
Extends Supabase auth.users with business information.

```sql
id UUID PRIMARY KEY
business_name TEXT
industry TEXT
business_size TEXT
setup_completed BOOLEAN
onboarding_step INTEGER
```

#### `subscriptions`
Stripe subscription data.

```sql
id UUID PRIMARY KEY
user_id UUID
stripe_customer_id TEXT
stripe_subscription_id TEXT
status TEXT
plan_name TEXT
plan_price DECIMAL
```

#### `business_documents`
Uploaded business documents.

```sql
id UUID PRIMARY KEY
user_id UUID
document_name TEXT
document_type TEXT
file_url TEXT
file_size INTEGER
mime_type TEXT
extracted_text TEXT
embedding VECTOR(1024)
processed BOOLEAN
```

#### `agent_nudges`
Proactive agent notifications.

```sql
id UUID PRIMARY KEY
user_id UUID
agent_id UUID
nudge_type TEXT
message TEXT
priority TEXT
dismissed BOOLEAN
```

### Agent-Specific Tables

#### HR Assistant
- `hr_candidates`: Candidate information with resume data
- `hr_jobs`: Job postings
- `hr_interviews`: Interview scheduling
- `hr_candidate_matches`: AI-powered candidate-job matching

#### Inventory Manager
- `inv_products`: Product catalog
- `inv_stock_movements`: Inventory transactions
- `inv_reorders`: Reorder requests
- `inv_demand_forecasts`: AI-powered demand predictions

#### Financial Analyst
- `fin_transactions`: Financial transactions
- `fin_budgets`: Budget allocations
- `fin_cashflow_forecasts`: Cash flow predictions
- `fin_anomalies`: Detected financial anomalies

#### Document Reviewer
- `doc_documents`: Document storage
- `doc_clauses`: Extracted clauses
- `doc_risk_assessments`: Risk analysis
- `doc_comparisons`: Document comparisons

#### Customer Support
- `cs_tickets`: Support tickets
- `cs_knowledge_base`: Knowledge base articles

## Cohere API Integration

### Models Used

#### Command-R-Plus
Used for: Main chat, reasoning, agent responses
```typescript
await cohere.chat({
  model: "command-r-plus",
  message: userMessage,
  chatHistory: history,
  preamble: systemPrompt
});
```

#### Embed v3.0
Used for: Document embeddings, semantic search
```typescript
await cohere.embed({
  model: "embed-english-v3.0",
  texts: documents,
  inputType: "search_document"
});
```

#### Rerank v3.0
Used for: Improving search results
```typescript
await cohere.rerank({
  model: "rerank-english-v3.0",
  query: searchQuery,
  documents: candidates,
  topN: 5
});
```

#### Classify
Used for: Categorization tasks
```typescript
await cohere.classify({
  model: "embed-english-v3.0",
  inputs: texts,
  examples: trainingExamples
});
```

## Error Handling

All API endpoints return errors in this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `AUTH_REQUIRED`: User not authenticated
- `INVALID_INPUT`: Invalid request parameters
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

Currently, rate limiting is handled by:
- Supabase Auth: Standard rate limits apply
- Cohere API: Subject to your plan limits
- Stripe: Standard API rate limits

## Security

### Authentication Flow
1. User signs up via Supabase Auth
2. Session token stored in httpOnly cookie
3. All API requests include session token
4. Server validates token via Supabase

### Data Access
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role key used for admin operations only

### File Upload Security
- Files stored in user-specific folders
- RLS policies enforce access control
- File type validation on upload
- Size limits enforced (10MB default)

## Webhooks

### Stripe Webhook
Endpoint: `/api/webhooks/stripe`
Signature verification required using `STRIPE_WEBHOOK_SECRET`

Events:
- Subscription created → Create subscription record
- Subscription updated → Update subscription status
- Subscription deleted → Mark subscription as cancelled
- Payment succeeded → Update subscription period
- Payment failed → Handle failed payment

## Development

### Local Testing
```bash
# Run dev server
npm run dev

# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Use Stripe test cards
4242 4242 4242 4242 - Success
4000 0000 0000 0002 - Declined
```

### Environment Variables
See `SETUP_GUIDE.md` for complete list of required environment variables.

## Future API Additions

Planned endpoints:
- `/api/calendar/sync` - Calendar integration
- `/api/email/send` - Email sending
- `/api/invoices/generate` - Invoice generation
- `/api/reports/schedule` - Automated report scheduling
- `/api/agents/customize` - Custom agent configuration
