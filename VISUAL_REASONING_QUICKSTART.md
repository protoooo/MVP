# Visual Reasoning API - Quick Start

## What Is This?

A production API that acts as a non-stop "second pair of eyes" for businesses. It evaluates images taken during normal workflows and returns structured, actionable feedback.

**Works across industries:** Food safety, retail, logistics, construction, healthcare, and more.

## Single Endpoint

```
POST /api/audit-media
```

Send images → Get structured analysis → Optionally receive via webhook

## Quick Examples

### 1. Zero-Config (Simplest)
```bash
curl -X POST https://your-app.com/api/audit-media \
  -H "X-Api-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/photo.jpg"],
    "metadata": {"location": "warehouse-a"}
  }'
```

### 2. With Industry Profile
```bash
curl -X POST https://your-app.com/api/audit-media \
  -H "X-Api-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/kitchen.jpg"],
    "standards_profile_id": "food-service-general-uuid",
    "metadata": {"location": "kitchen", "task": "cleaning"}
  }'
```

### 3. Response Example
```json
{
  "findings": [
    {
      "type": "issue",
      "severity": "major",
      "category": "Safety",
      "description": "Boxes stacked above safe height",
      "confidence": 0.92,
      "recommendation": "Reduce stack height to 6 feet"
    }
  ],
  "overall_score": 85,
  "compliant": true,
  "credits_used": 1,
  "remaining_credits": 999
}
```

## Features

### Three Layers of Intelligence
1. **General Visual Reasoning** - Base AI understands objects, damage, safety, cleanliness
2. **Task Context** - API guides evaluation based on industry and task type
3. **Customer Standards** - Optional rules and documents for precision

### Zero-Config Mode
No setup required. Just send images and get intelligent analysis based on common best practices.

### Standards Profiles
Pre-configured for common industries:
- **Food**: Kitchen, storage, receiving, cleaning
- **Retail**: Store checks, stocking, receiving
- **Logistics**: Warehouse, delivery verification
- **Construction**: Safety, quality checks
- **Healthcare**: Cleaning, compliance
- **General**: Works for any industry

### Custom Profiles
Create profiles with your specific rules:
```javascript
POST /api/profiles
{
  "profile_name": "My Warehouse Standards",
  "industry": "logistics",
  "task_type": "storage",
  "plain_language_rules": [
    "All pallets must be shrink-wrapped",
    "Aisles must be clear",
    "Temperature 60-75°F"
  ]
}
```

### Webhooks
Register a webhook to receive results asynchronously:
```javascript
POST /api/webhooks
{
  "webhook_url": "https://your-server.com/webhook",
  "max_retries": 3
}
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/audit-media` | POST | Analyze images/videos |
| `/api/profiles` | GET/POST/PUT/DELETE | Manage standards profiles |
| `/api/webhooks` | GET/POST/PUT/DELETE | Manage webhook config |

## Documentation

- **Full API Docs**: See `VISUAL_REASONING_API.md`
- **Examples**: See `examples/visual-reasoning-api-examples.js`
- **Migration Guide**: See `MIGRATION_GUIDE.md` (for existing food safety users)

## Setup

### 1. Database
Run SQL migrations:
```sql
-- Existing tables (if not already created)
database/schema-payment-based.sql

-- New tables for Visual Reasoning API
database/schema-standards-profiles.sql
```

### 2. Environment Variables
```bash
# Already in .env.local.example
COHERE_API_KEY=your_cohere_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Get API Key
Purchase credits via Stripe payment links → Receive API key via email

### 4. Start Using
```bash
# Install example dependencies
npm install node-fetch form-data

# Run examples
API_KEY=your_key node examples/visual-reasoning-api-examples.js 1
```

## Use Cases

### Restaurant Chains
Every photo during store checks → instant compliance data

### Retail Stores
Inventory photos → auto-check organization and compliance

### Warehouses
Daily inspections → structured safety and quality reports

### Construction Sites
Site photos → automated safety and quality verification

### Any Business
Take photos during normal work → Get verification feedback

## Pricing

- 1 credit = 1 image analyzed
- Prepaid packs or subscriptions
- No per-second limits (only credit-based)

## Support

- Technical docs: `VISUAL_REASONING_API.md`
- Integration examples: `examples/` directory
- Migration guide: `MIGRATION_GUIDE.md`

## Architecture

- **Frontend**: Next.js 15 (landing page only)
- **API**: Next.js API Routes
- **AI**: Cohere Vision AYA-32B
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Deployment**: Railway

---

**This is infrastructure for turning images into decisions.**
No new hardware. No new workflows. No AI expertise required.
