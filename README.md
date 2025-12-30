# Michigan Tenant Condition Report System

A web application that helps Michigan tenants document habitability issues in their rental units through professional photo analysis and automated PDF report generation.

## Overview

This system allows tenants to:
1. Upload photos of their rental unit (up to 200 photos)
2. Get AI-powered analysis of visible habitability violations
3. Receive a professional PDF report with legal references and landlord obligations
4. Pay a one-time fee of $20 (no subscription or account required)

## What the System Can Analyze (Photographable Issues Only)

✅ **Visible Conditions**:
- Mold, mildew, water damage, stains
- Broken windows, doors, locks
- Holes in walls, ceilings, floors
- Visible pest infestations (roaches, droppings, bedbugs)
- Exposed or damaged electrical wiring
- Broken/missing smoke detectors (if visible)
- Damaged or leaking plumbing fixtures
- Structural damage (cracks, sagging)
- Missing handrails on stairs
- Peeling paint (lead paint concern in pre-1978 buildings)
- Broken appliances (visual damage)
- Trash accumulation, unsanitary conditions

❌ **Cannot Detect** (non-visible issues):
- Heat/HVAC not working
- No hot water
- Electrical outlets not working
- Gas leaks
- Poor ventilation (unless visible mold/damage)
- Noise issues
- Pest infestations not visible in photos

The system includes a checklist in the report for tenants to document these non-visible issues.

## Technology Stack

- **Frontend**: Next.js 15 (React 19)
- **Backend**: Next.js API Routes
- **AI Analysis**: Cohere AYA Vision (c4ai-aya-vision-32b)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (one-time payments, no subscriptions)
- **PDF Generation**: PDFKit
- **Storage**: Supabase Storage

## Features

### Tenant-Focused Features
- **No Account Required**: Email-based access code system
- **Simple Payment**: One-time $20 payment for up to 200 photos
- **Drag & Drop Upload**: Easy photo upload with room/area tagging
- **Progress Tracking**: Real-time upload and analysis progress
- **Professional PDF Report** includes:
  - Cover page with report metadata
  - Executive summary of findings
  - Issues organized by room/area
  - Confidence levels (Clear violation, Likely issue, Requires assessment)
  - Michigan tenant rights and legal code references
  - Required landlord actions with timelines
  - Consequences if issues are not corrected
  - Checklist for non-photographable issues
  - Michigan tenant resources and contacts

### Technical Features
- **AI-Powered Analysis**: Computer vision analysis of photos for habitability issues
- **Confidence Scoring**: Three levels (Clear violation 0.8-1.0, Likely issue 0.5-0.79, Requires assessment 0.3-0.49)
- **Abuse Prevention**:
  - Duplicate photo detection
  - Rate limiting per IP address
  - Content hashing for fraud prevention
- **Secure**: No PII stored, reports expire after 90 days
- **Scalable**: Serverless architecture

## Installation & Setup

### Prerequisites
- Node.js 20.x
- npm 10.x
- Supabase account
- Stripe account
- Cohere API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MVP
npm install
```

### 2. Database Setup

Run the tenant reports schema in your Supabase SQL Editor:

```sql
-- Copy and paste contents of database/schema-tenant-reports.sql
```

This creates:
- `tenant_reports` - Main report tracking table
- `tenant_photos` - Photo storage and analysis results
- `rate_limits` - IP-based rate limiting
- `tenant_non_visible_issues` - Non-photographable issues checklist
- Helper functions for duplicate detection and rate limiting

### 3. Environment Variables

Create a `.env.local` file:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere AI
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Stripe Configuration

#### Create Product for Tenant Reports

1. Go to Stripe Dashboard → Products
2. Create a product:
   - **Name**: Michigan Tenant Condition Report
   - **Description**: Professional habitability report for up to 200 photos
   - **Price**: $20.00 (one-time payment)
   - **Metadata**: 
     - `type`: `tenant_report`
     - `max_photos`: `200`

#### Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 5. Supabase Storage Setup

Create two storage buckets:
1. `tenant-photos` (public)
2. `tenant-reports` (public)

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/tenant` to see the tenant landing page.

### 7. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Tenant Report Flow

#### 1. Create Checkout Session
```
POST /api/tenant/create-checkout
```

**Request**:
```json
{
  "customerEmail": "tenant@example.com",
  "propertyAddress": "123 Main St, Detroit, MI",
  "photoCount": 50
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "reportId": "uuid",
  "accessCode": "ABC12345"
}
```

#### 2. Upload Photos
```
POST /api/tenant/upload-photos
```

**Request** (multipart/form-data):
- `reportId`: Report UUID
- `accessCode`: Access code from checkout
- `photos`: Array of image files
- `roomAreas`: Array of room identifiers (e.g., 'kitchen', 'bathroom')

**Response**:
```json
{
  "success": true,
  "uploaded": 50,
  "duplicates": 2,
  "total_photos": 50,
  "photos": [...]
}
```

#### 3. Generate Report
```
POST /api/tenant/generate-report
```

**Request**:
```json
{
  "reportId": "uuid",
  "accessCode": "ABC12345",
  "nonVisibleIssues": {
    "no_heat": true,
    "no_hot_water": false,
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "reportId": "uuid",
  "accessCode": "ABC12345",
  "pdfUrl": "https://...",
  "summary": {
    "violations_found": 5,
    "clear_violations": 2,
    "likely_issues": 3
  }
}
```

#### 4. Get Report
```
GET /api/tenant/get-report?code=ABC12345
```

**Response**:
```json
{
  "reportId": "uuid",
  "accessCode": "ABC12345",
  "status": "completed",
  "pdfUrl": "https://...",
  "summary": {...}
}
```

## User Flow

1. **Landing Page** (`/tenant`)
   - Tenant enters email and property address
   - Selects estimated number of photos
   - Clicks "Continue to Payment"

2. **Stripe Checkout**
   - Secure payment processing
   - One-time $20 payment
   - Redirects to upload page on success

3. **Upload Page** (`/tenant/upload`)
   - Drag & drop photo upload
   - Tag photos by room/area
   - Fill out non-visible issues checklist
   - Click "Generate Report"

4. **Processing**
   - Photos uploaded to Supabase Storage
   - AI analysis runs on each photo
   - PDF report generated

5. **Report Page** (`/tenant/report`)
   - View summary statistics
   - Download PDF report
   - Access next steps and resources

## Rate Limiting

- **Payment attempts**: 5 per hour per IP
- **Upload attempts**: 10 per hour per IP
- **Download attempts**: Unlimited (with valid access code)

## Abuse Prevention

- **Duplicate Photo Detection**: Content hashing prevents same photos from being uploaded multiple times
- **Cross-Report Detection**: Flags if same photo used in multiple reports within 24 hours
- **Rate Limiting**: IP-based limits on payment and upload actions
- **Report Expiration**: Reports automatically expire after 90 days

## Security & Privacy

- **No User Accounts**: No passwords, no PII storage
- **Email-Only Access**: Reports accessed via unique codes sent to email
- **Secure Payments**: All payment processing through Stripe
- **Data Retention**: Reports expire after 90 days
- **HTTPS**: All traffic encrypted in transit
- **Row-Level Security**: Database policies enforce access controls

## Legal Disclaimers

The system includes prominent disclaimers that:
- This is NOT legal advice
- Does not create attorney-client relationship
- Analysis based on AI review of photographs
- May not capture all issues
- Tenants should consult qualified attorney before legal action
- Only analyzes VISIBLE conditions

## Deployment

### Railway / Vercel / Netlify

1. Connect your Git repository
2. Set environment variables
3. Deploy

### Environment Variables Required in Production
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COHERE_API_KEY`
- `NEXT_PUBLIC_BASE_URL`

## Costs

### Per Report
- **Cohere Vision API**: ~$0.50-2.00 (depending on photo count)
- **Supabase Storage**: Minimal (~$0.01)
- **Stripe Fee**: $0.58 + 2.9% = $1.16 total

**Total Cost**: ~$1.67-3.17 per report
**Revenue**: $20.00 per report
**Profit Margin**: ~$16.83-18.33 per report (84-92%)

### Monthly Fixed Costs
- **Supabase**: Free tier sufficient for low volume, $25/mo for Pro
- **Domain**: ~$12/year
- **Hosting**: Free on Vercel/Netlify

## Future Enhancements

- [ ] Email notifications when report is ready
- [ ] Multi-language support (Spanish)
- [ ] Integration with Michigan Legal Aid organizations
- [ ] Mobile app version
- [ ] Batch processing for multi-unit properties
- [ ] Landlord response tracking
- [ ] Court-ready evidence packages

## Support

For technical issues:
- Check logs in Supabase Dashboard
- Review Stripe webhook events
- Contact Cohere support for API issues

For tenant support:
- Direct to Michigan Legal Help: https://michiganlegalhelp.org
- Local legal aid organizations
- Housing code enforcement

## License

Proprietary - Michigan Tenant Condition Report System

## Contributors

Built with GitHub Copilot assistance.
