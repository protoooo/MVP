# Michigan Food Safety Photo Compliance Engine

**Pure API + Webhook Integration** - Automatic compliance checks for photos taken during normal operations.

## Overview

A developer-focused food safety compliance API that integrates into existing workflows:
- **Webhook/API Integration**: Photos taken during inventory, stocking, store scans → automatic compliance checks
- **No UI Required**: Pure API for in-house system integration
- **Flexible Output**: JSON response → store in DB, export to Excel, integrate anywhere
- **Powered by Cohere**: Vision AYA-32B, Rerank 4.0, Embed 4.0

## Cost & Pricing

- **Your Cost**: $0.01/image (Cohere Vision)
- **Pricing**: $0.03-$0.04/image (300-400% margin)

### Prepaid Packs (No commitment)
- **Starter**: 1,000 images - $39 ($0.039/image)
- **Pro**: 10,000 images - $349 ($0.035/image)  
- **Enterprise**: 100,000 images - $3,000 ($0.03/image)

### Subscriptions (Unlimited webhooks)
- **Growth**: $99/mo → 3,000 images included + $0.03/extra
- **Chain**: $499/mo → 20,000 images included + $0.025/extra
- **Enterprise**: $1,999/mo → Unlimited images

## Single Endpoint

### POST /api/audit-photos

**Request (JSON):**
```json
{
  "images": ["https://example.com/kitchen.jpg"],
  "api_key": "sk_your_api_key_here",
  "location": "kitchen"
}
```

**Response:**
```json
{
  "violations": ["3-501.16 Cold storage <41°F"],
  "score": 87,
  "michigan_code_refs": ["3-501.16"],
  "analyzed_count": 1,
  "violation_count": 1,
  "credits_used": 1,
  "remaining_credits": 999
}
```

**Error (402 - Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "remaining_credits": 0,
  "buy_more": "https://protocollm.com/#pricing"
}
```

## Quick Start

### 1. Buy API Credits

Visit the landing page and purchase a prepaid pack or subscription. You'll receive an API key via email instantly.

### 2. Integration Examples

#### cURL
```bash
curl -X POST https://your-app.railway.app/api/audit-photos \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/kitchen.jpg"],
    "api_key": "sk_your_api_key_here"
  }'
```

#### JavaScript / Node.js
```javascript
const response = await fetch('https://your-app.railway.app/api/audit-photos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    images: ['https://example.com/kitchen.jpg'],
    api_key: 'sk_your_api_key_here'
  })
})

const data = await response.json()
console.log('Score:', data.score)
console.log('Violations:', data.violations)
console.log('Michigan Codes:', data.michigan_code_refs)
```

#### Python
```python
import requests

response = requests.post(
    'https://your-app.railway.app/api/audit-photos',
    json={
        'images': ['https://example.com/kitchen.jpg'],
        'api_key': 'sk_your_api_key_here'
    }
)

data = response.json()
print(f"Score: {data['score']}")
print(f"Violations: {data['violations']}")
print(f"Codes: {data['michigan_code_refs']}")
```

#### Webhook Integration Pattern
```javascript
// Webhook receiver in your in-house system
app.post('/webhook/photos', async (req, res) => {
  const { photos, location_id } = req.body
  
  // Send to compliance API
  const result = await fetch('https://your-app.railway.app/api/audit-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: photos.map(p => p.url),
      api_key: process.env.FOOD_SAFETY_API_KEY,
      location: location_id
    })
  }).then(r => r.json())
  
  // Store in your database, Excel, or wherever
  await db.compliance_logs.insert({
    location_id,
    score: result.score,
    violations: result.violations,
    michigan_codes: result.michigan_code_refs,
    timestamp: new Date()
  })
  
  res.json({ success: true })
})
```

## Setup Instructions (For Deployment)

### 1. Database Setup (Supabase)

Run the SQL schema in your Supabase SQL Editor:

```bash
# Located in: database/schema-payment-based.sql
```

This creates:
- `api_keys` table - Stores prepaid API credits and subscriptions
- `one_off_reports` table - Tracks report payments (legacy, can be removed)

### 2. Environment Variables

Create a `.env.local` file based on `.env.local.example`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Payment Links (create in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_LINK_STARTER=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_PRO=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_GROWTH=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_CHAIN=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB=https://buy.stripe.com/...

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-app.railway.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere (Vision AYA-32B, Rerank 4.0, Embed 4.0)
COHERE_API_KEY=your_cohere_api_key
```

### 3. Stripe Configuration

#### A. Create Prepaid Products

1. Go to Stripe Dashboard → Products
2. Create 3 one-time payment products:
   - **Starter**: $39 one-time
     - Metadata: `tier=starter`, `credits=1000`, `type=api_credits`
   - **Pro**: $349 one-time
     - Metadata: `tier=pro`, `credits=10000`, `type=api_credits`
   - **Enterprise**: $3,000 one-time
     - Metadata: `tier=enterprise`, `credits=100000`, `type=api_credits`
3. Create Payment Links for each

#### B. Create Subscription Products

1. Create 3 monthly subscription products:
   - **Growth**: $99/month (metered billing available)
     - Metadata: `tier=growth`, `included=3000`, `extra_rate=0.03`
   - **Chain**: $499/month (metered billing available)
     - Metadata: `tier=chain`, `included=20000`, `extra_rate=0.025`
   - **Enterprise**: $1,999/month (unlimited)
     - Metadata: `tier=enterprise_sub`, `unlimited=true`
2. Create Payment Links for each

#### C. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.railway.app/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Deploy to Railway

```bash
git push origin main
```

Railway will automatically deploy using the configuration in `railway.json`.

## Use Cases

### Restaurant Chains
Every photo during store checks → instant compliance data → 100K+ photos/month

### Grocery & Retail  
Inventory photos during normal stocking → auto-check food safety compliance

### Food Safety Systems
Add compliance layer to existing photo workflows in any in-house system

### Health Departments
Inspection photos → instant violation detection with Michigan code references

## Michigan Food Code Focus

The system is trained on 9 core Michigan Food Code violations:

1. **Temperature Control** (3-501.16, 3-501.17)
   - Cold holding <41°F
   - Hot holding >135°F
   - Cooling/reheating procedures

2. **Cross Contamination** (3-302.11)
   - Raw vs. ready-to-eat separation
   - Proper storage practices

3. **Equipment & Facilities** (4-601.11, 4-202.16)
   - Clean surfaces
   - Proper equipment maintenance

4. **Personal Hygiene** (2-301.11, 2-401.11)
   - Handwashing compliance
   - Proper glove usage

5. **Chemical Storage** (7-206.11, 7-207.11)
   - Proper labeling
   - Safe storage away from food

6. **Pest Control** (6-202.11)
   - Evidence of pests
   - Proper exclusion

7. **Food Labeling** (3-602.11)
   - Date marking
   - Proper identification

8. **Sanitation** (4-501.11)
   - Cleaning schedules
   - Sanitizer concentrations

9. **Employee Health** (2-201.11)
   - Illness reporting
   - Exclusion criteria

## Architecture

- **Frontend**: Next.js 15 (landing page only)
- **API**: Next.js API Routes
- **AI**: Cohere Vision AYA-32B, Rerank 4.0, Embed 4.0
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (Checkout + Webhooks)
- **Deployment**: Railway

## Security

- No user accounts or passwords
- API keys are cryptographically secure (256-bit)
- Stripe handles all payment processing (PCI compliant)
- Row Level Security (RLS) enabled on database tables
- Webhook signature verification
- Rate limiting on API endpoints

## Support

For issues or questions:
- API Key not received: Check spam folder or contact support
- Credits not deducted: Contact support with session_id
- Integration help: See examples in this README

## License

Proprietary - Michigan Food Safety Compliance System
