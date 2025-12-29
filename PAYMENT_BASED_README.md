# Michigan Food Safety Photo Analysis - Payment-Based System

## Overview

A simplified, payment-based food safety compliance app with **NO ACCOUNTS**:
- **$50 One-Off Reports**: Upload photos → Pay → Download PDF
- **API Access**: Buy prepaid credits → Get API key → Integrate with your systems

## Features

### 1. $50 Reports
- Drag-and-drop image upload
- Stripe Checkout payment
- Instant Michigan health code compliance analysis
- PDF report via email and download

### 2. API Access
Prepaid credit packs (no signup required):
- **500 images** - $49 ($0.098/image)
- **5,000 images** - $399 ($0.0798/image)
- **500,000 images** - $3,499 ($0.007/image)

## Setup Instructions

### 1. Database Setup (Supabase)

Run the SQL schema in your Supabase SQL Editor:

```bash
# Located in: database/schema-payment-based.sql
```

This creates:
- `api_keys` table - Stores prepaid API credits
- `one_off_reports` table - Tracks $50 report payments

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Payment Links (create these in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_LINK_500=https://buy.stripe.com/test_...     # 500 images - $49
NEXT_PUBLIC_STRIPE_LINK_5000=https://buy.stripe.com/test_...    # 5K images - $399
NEXT_PUBLIC_STRIPE_LINK_500K=https://buy.stripe.com/test_...    # 500K images - $3,499

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-app.railway.app

# Existing Supabase & Cohere settings
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
COHERE_API_KEY=...
```

### 3. Stripe Configuration

#### A. Create Payment Links (for API Credits)

1. Go to Stripe Dashboard → Products
2. Create 3 products:
   - **500 Images**: $49 one-time payment
     - Add metadata: `tier=small`, `credits=500`, `type=api_credits`
   - **5,000 Images**: $399 one-time payment
     - Add metadata: `tier=medium`, `credits=5000`, `type=api_credits`
   - **500,000 Images**: $3,499 one-time payment
     - Add metadata: `tier=large`, `credits=500000`, `type=api_credits`
3. Create Payment Links for each
4. Copy URLs to environment variables

#### B. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.railway.app/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Deploy

Deploy to Railway:

```bash
git push origin main
```

## API Documentation

### POST /api/audit-photos

Analyze photos using your API key.

**Headers:**
```
X-Api-Key: sk_your_api_key_here
Content-Type: multipart/form-data
```

**Body (form-data):**
```
files: [File, File, ...]  # Image files
location: string           # Optional: 'kitchen', 'storage', etc.
```

**Response:**
```json
{
  "session_id": "uuid",
  "score": 85,
  "report_url": "https://...",
  "summary": "Analysis summary...",
  "analyzed_count": 10,
  "violation_count": 2,
  "credits_used": 10,
  "remaining_credits": 490,
  "violations": [
    {
      "description": "Food stored at incorrect temperature",
      "type": "temperature",
      "severity": "critical",
      "confidence": 0.92,
      "location": "kitchen"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid API key
- `402 Payment Required` - Insufficient credits
- `400 Bad Request` - No files provided

### Example Integration

#### cURL
```bash
curl -X POST https://your-app.railway.app/api/audit-photos \
  -H "X-Api-Key: sk_your_api_key" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "location=kitchen"
```

#### JavaScript
```javascript
const formData = new FormData()
formData.append('files', photo1)
formData.append('files', photo2)
formData.append('location', 'kitchen')

const response = await fetch('https://your-app.railway.app/api/audit-photos', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'sk_your_api_key'
  },
  body: formData
})

const data = await response.json()
console.log(`Score: ${data.score}, Credits remaining: ${data.remaining_credits}`)
```

#### Python
```python
import requests

files = [
    ('files', open('photo1.jpg', 'rb')),
    ('files', open('photo2.jpg', 'rb'))
]

headers = {'X-Api-Key': 'sk_your_api_key'}
data = {'location': 'kitchen'}

response = requests.post(
    'https://your-app.railway.app/api/audit-photos',
    headers=headers,
    files=files,
    data=data
)

result = response.json()
print(f"Score: {result['score']}, Remaining: {result['remaining_credits']}")
```

## Integration Examples

### Jolt Integration

```javascript
// Webhook receiver for Jolt photo uploads
app.post('/webhook/jolt', async (req, res) => {
  const { photos, location_id } = req.body
  
  const formData = new FormData()
  for (const photo of photos) {
    const blob = await fetch(photo.url).then(r => r.blob())
    formData.append('files', blob, photo.filename)
  }
  formData.append('location', location_id)
  
  const result = await fetch('https://your-app.railway.app/api/audit-photos', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.FOOD_SAFETY_API_KEY },
    body: formData
  }).then(r => r.json())
  
  // Send result back to Jolt or store in your system
  console.log('Analysis complete:', result)
})
```

### Kroger/Lightspeed Integration

```javascript
// Process inventory photos from Lightspeed
async function analyzeInventoryPhoto(imageUrl, location) {
  const blob = await fetch(imageUrl).then(r => r.blob())
  
  const formData = new FormData()
  formData.append('files', blob, 'inventory.jpg')
  formData.append('location', location)
  
  const response = await fetch('https://your-app.railway.app/api/audit-photos', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.FOOD_SAFETY_API_KEY },
    body: formData
  })
  
  if (response.status === 402) {
    // Out of credits - notify admin
    console.error('API credits exhausted!')
  }
  
  return response.json()
}
```

## User Flows

### Restaurant Owner (One-Off Report)
1. Visit `/simple`
2. Drag-drop restaurant photos
3. Click "Generate Report ($50)"
4. Complete Stripe Checkout
5. Redirected to success page
6. Download PDF report

### Chain/Enterprise (API Access)
1. Visit `/simple`
2. Click desired API tier (e.g., "5,000 images - $399")
3. Complete Stripe Payment Link
4. Receive API key via email
5. Integrate with existing systems (Jolt, Kroger, etc.)
6. POST photos to `/api/audit-photos` with API key

## Cost Structure

- **One-Off**: $50 per report (unlimited photos in single upload)
- **API Small**: $49 for 500 images ($0.098/image)
- **API Medium**: $399 for 5,000 images ($0.0798/image) 
- **API Large**: $3,499 for 500,000 images ($0.007/image)

## Security

- No user accounts or passwords
- API keys are cryptographically secure (256-bit)
- Stripe handles all payment processing (PCI compliant)
- Row Level Security (RLS) enabled on database tables
- Webhook signature verification

## Support

For issues or questions:
- API Key not received: Check spam folder or contact support
- Credits not deducted: Contact support with session_id
- Integration help: See examples above or contact support

## License

Proprietary - Michigan Food Safety Compliance System
