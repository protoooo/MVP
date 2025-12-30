# ProtocolLM - Subscription-Based Image Compliance Analysis

A subscription-only, image-only product for food service compliance analysis.

## Overview

ProtocolLM is a simple, fast, and operational tool built for daily restaurant use. It analyzes images of food service areas against food safety regulations and generates PDF compliance reports.

## Key Features

- **Subscription-Based**: Three monthly plans (200, 500, or 1,500 images)
- **Image-Only**: Upload photos of kitchen and prep areas for AI-powered analysis
- **PDF Reports**: Generate compliance reports with violation details
- **Email Delivery**: Optional email delivery to GM and Owner
- **Usage Tracking**: Monitor monthly image quota usage
- **Optional Checklist**: Lightweight nudges for common inspection areas

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 (React)
- **Backend**: Next.js API Routes
- **Auth & DB**: Supabase
- **File Storage**: Supabase Storage
- **Billing**: Stripe Subscriptions
- **AI**: Cohere Vision API

### Authentication

- Email/password authentication via Supabase Auth
- Each user represents ONE business (no teams or roles)
- Persistent sessions with Supabase client

### Database Schema

The `user_profiles` table stores subscription data:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_plan TEXT,
  monthly_image_limit INTEGER DEFAULT 0,
  images_used_this_period INTEGER DEFAULT 0,
  billing_cycle_start TIMESTAMP,
  billing_cycle_end TIMESTAMP,
  subscription_status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Subscription Plans

### Stripe Price IDs

Configure these exact Stripe Price IDs:

1. **protocollm_image_200_monthly** - $25/month - 200 images
2. **protocollm_image_500_monthly** - $50/month - 500 images
3. **protocollm_image_1500_monthly** - $100/month - 1,500 images

All plans have identical features; only the image allowance differs.

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_200_MONTHLY=price_xxx
STRIPE_PRICE_ID_500_MONTHLY=price_xxx
STRIPE_PRICE_ID_1500_MONTHLY=price_xxx

# Cohere
COHERE_API_KEY=your_cohere_api_key

# Application
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Usage Flow

### 1. User Sign Up
- Visit `/auth/signup`
- Create account with email and password
- Supabase creates user record

### 2. Subscribe to Plan
- Choose a plan on the homepage
- Redirect to Stripe Checkout
- On success, webhook creates/updates user profile

### 3. Upload Images
- Visit `/upload` (requires authentication)
- View remaining quota
- Optionally use checklist for reminders
- Select images and upload
- Quota is tracked and decremented

### 4. Get Report
- PDF report is generated automatically
- Optional email delivery to GM/Owner
- Download link provided in response

### 5. Monthly Reset
- Stripe webhook resets `images_used_this_period` to 0
- Occurs automatically on billing cycle renewal

## API Endpoints

### Authentication
- `POST /api/auth/*` - Handled by Supabase Auth

### Subscriptions
- `POST /api/subscription/create` - Create Stripe checkout session
- `POST /api/subscription/webhook` - Handle Stripe events

### Image Analysis
- `POST /api/image/analyze-subscription` - Upload and analyze images (requires auth)

### Legacy (One-Time Payment)
- `POST /api/payment/create` - Legacy endpoint (deprecated)
- `POST /api/payment/webhook` - Legacy webhook (deprecated)

## Webhooks

Configure Stripe webhook endpoint: `/api/subscription/webhook`

Handles these events:
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update subscription details
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Reset usage on new billing cycle
- `invoice.payment_failed` - Mark subscription as past_due

## Email Service

The email service is currently a placeholder. To enable email delivery:

1. Choose an email provider (Resend, SendGrid, AWS SES, etc.)
2. Add API key to environment variables
3. Update `lib/emailService.js` with provider integration

Example with Resend:
```javascript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
await resend.emails.send({...})
```

## Important Constraints

### What's Included
- Image upload and analysis
- PDF report generation
- Email delivery (optional)
- Monthly quota tracking
- Subscription management

### What's NOT Included
- No video processing
- No dashboards
- No saved history
- No violation trends
- No analytics views
- No feature gating beyond image count
- No one-time purchases

## Development

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

## Deployment

1. Deploy to your hosting platform (Vercel, Railway, etc.)
2. Configure environment variables
3. Set up Supabase database and auth
4. Create Stripe products and prices
5. Configure Stripe webhook endpoint
6. Test subscription flow end-to-end

## Support

This is a simple, operational tool designed for daily restaurant use. Keep it simple, fast, and predictable.
