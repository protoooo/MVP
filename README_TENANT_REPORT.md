# Michigan Tenant Condition Report Generator

**Professional rental condition documentation for Michigan tenants** - Simple, affordable, defensible.

## Overview

A web-based system for tenants in Michigan to upload photos of their rental units and automatically generate a professional, neutral PDF condition report based on Michigan housing habitability standards. 

- **Single pricing**: $20 for up to 200 photos
- **No accounts required**: One-time purchase, instant report
- **Michigan-focused**: Based on Michigan housing law and habitability standards
- **AI-powered**: Uses Cohere for intelligent image analysis
- **Professional output**: PDF report with findings, severity levels, and legal references

![Michigan Tenant Report Generator](https://github.com/user-attachments/assets/cff0442f-27be-44d0-8520-a85c40fabafb)

## Features

### Simple User Experience
- **Drag & drop upload**: Adobe-style minimal interface
- **Up to 200 photos**: Document entire rental property
- **One-time payment**: $20 via Stripe, no subscription
- **Instant generation**: Report ready in 2-5 minutes
- **Professional PDF**: Download immediately after generation

### AI-Powered Analysis
Uses Cohere's advanced AI to analyze photos for:
- Water damage, leaks, or moisture problems
- Mold or mildew
- Structural damage (cracks, holes, deterioration)
- Electrical hazards
- Heating or plumbing issues
- Pest evidence
- Broken locks or security issues

### Michigan Housing Standards
Reports reference relevant Michigan housing laws:
- **MCL 554.139** - Landlord obligations for fitness and habitability
- **MCL 125.401-125.543** - Housing Law of Michigan (Blight Standards)
- **MCL 125.1504a** - Building Code enforcement
- **MCL 125.530** - Minimum standards for heating facilities

### Professional Report Output
Each PDF report includes:
- Cover page with report metadata
- Executive summary with severity breakdown
- Detailed findings by category
- High/Medium/Low severity indicators
- Recommended actions for each issue
- Michigan law references
- Professional disclaimers

## How It Works

1. **Upload Photos**: Drag and drop up to 200 photos of your rental unit
2. **Pay $20**: One-time payment via Stripe checkout
3. **AI Analysis**: Cohere analyzes photos for habitability issues
4. **Generate Report**: Professional PDF created with findings
5. **Download**: Instant download of completed report

## Setup & Deployment

### Prerequisites
- Node.js 20.x
- Stripe account (for payments)
- Cohere API key (for AI analysis)
- Railway or similar hosting platform

### Environment Variables

Create a `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-app.railway.app

# Supabase (for legacy routes, can be removed)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere AI
COHERE_API_KEY=your_cohere_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. In Stripe Dashboard → Developers → API keys, copy your secret key
3. Configure webhook endpoint: `https://your-domain.com/api/tenant-report/webhook`
4. Select event: `checkout.session.completed`
5. Copy webhook secret to environment variables

### Deployment

The app is configured for Railway deployment with `railway.json`:

```bash
git push origin main
```

Railway will automatically:
- Install dependencies
- Build the Next.js app
- Start the production server
- Set environment variables from Railway dashboard

## API Endpoints

### Upload Photos
```
POST /api/tenant-report/upload
Content-Type: multipart/form-data

Form Data:
- photos: File[] (up to 200 images)

Response:
{
  "sessionId": "uuid",
  "photoCount": 5,
  "photos": [...]
}
```

### Create Checkout
```
POST /api/tenant-report/create-checkout
Content-Type: application/json

Body:
{
  "sessionId": "uuid",
  "photoCount": 5
}

Response:
{
  "url": "https://checkout.stripe.com/..."
}
```

### Check Status
```
GET /api/tenant-report/status?session_id=cs_...

Response:
{
  "status": "processing|completed|error",
  "progress": 50,
  "reportUrl": "/api/tenant-report/download?session_id=cs_..."
}
```

### Download Report
```
GET /api/tenant-report/download?session_id=cs_...

Response: PDF file
```

## Architecture

- **Frontend**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS (Adobe-style minimal design)
- **AI**: Cohere API (Command R Plus for analysis)
- **PDF**: PDFKit for report generation
- **Payments**: Stripe Checkout + Webhooks
- **Storage**: Local filesystem (uploads/, reports/)
- **Deployment**: Railway

## Security & Privacy

- **No user accounts**: No passwords or personal data stored
- **Secure payments**: All payment processing via Stripe (PCI compliant)
- **Temporary storage**: Photos stored only during report generation
- **No tracking**: Minimal analytics, respects user privacy
- **Legal disclaimer**: Clear disclaimers about report limitations

## Cost Structure

### User Cost
- **$20 per report** - up to 200 photos

### Operating Cost (Estimated)
- **Cohere API**: ~$0.10-0.50 per report (depending on photo count)
- **Stripe fees**: $0.58 + 2.9% = ~$1.16 per transaction
- **Hosting**: Railway free tier or ~$5/month
- **Total cost**: ~$1.66-2.06 per report
- **Margin**: ~$18 per report

## Disclaimers

**Important**: This system generates documentation based on visual analysis of photos. It does not constitute legal advice or guarantee any particular outcome. Michigan housing laws and local enforcement may vary. Users should consult with a qualified attorney for legal advice.

The AI analysis is designed to be:
- **Factual**: Describes what is visible in photos
- **Neutral**: Avoids speculation or legal conclusions
- **Professional**: Uses standard terminology
- **Defensible**: Based on recognized habitability standards

## Support

For issues or questions:
- Check the documentation above
- Review Michigan housing law references
- Consult a local tenant rights organization
- Contact support (if configured)

## License

Proprietary - Michigan Tenant Condition Report Generator

---

**Built with Michigan tenants in mind** - Making rental documentation simple, professional, and accessible.
