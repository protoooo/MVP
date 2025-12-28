# One-Time Purchase License System - Setup Instructions

## Overview
This system removes authentication and trial functionality, replacing it with a one-time purchase model where users buy access codes to process videos.

## Setup Steps

### 1. Database Schema (REQUIRED)

**You must run the SQL schema in Supabase before the system will work.**

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the entire contents of `supabase_schema.sql`
4. Paste and execute it in the SQL Editor

This will create:
- `access_codes` table - Stores 6-digit access codes
- `code_usage` table - Tracks usage history
- Admin code `800869` for testing
- Helper functions for code generation

### 2. Environment Variables

Add or update these environment variables in your `.env` file or Railway/Vercel dashboard:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price ID for $149 inspection report (create in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT=price_your_price_id_here

# OR use Stripe Payment Link (simpler for testing)
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/your_link_here

# Email Configuration (Resend)
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=protocolLM <support@protocollm.org>

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL
NEXT_PUBLIC_BASE_URL=https://protocollm.org
```

### 3. Stripe Setup

#### Option A: Using Stripe Price ID (Recommended)
1. Go to Stripe Dashboard → Products
2. Create a new product: "Restaurant Health Inspection Report"
3. Add a one-time payment price: $149.00
4. Copy the Price ID (starts with `price_`)
5. Set `NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT=price_...`

#### Option B: Using Stripe Payment Link (Simpler)
1. Go to Stripe Dashboard → Payment Links
2. Create a new payment link for $149
3. Set it to collect email address
4. Copy the payment link URL
5. Set `NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...`
6. Update `page-simple.client.js` to use the payment link

### 4. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
4. Copy the webhook signing secret
5. Set `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5. Testing

#### Test the Complete Flow

1. **Purchase Flow:**
   ```bash
   # Navigate to home page
   # Click "Purchase License ($149)"
   # Complete payment on Stripe (use test card: 4242 4242 4242 4242)
   # Check email for access code
   ```

2. **Access Code Validation:**
   ```bash
   # Enter the 6-digit code on home page
   # Should validate and show upload interface
   ```

3. **Admin Code:**
   ```bash
   # Enter code: 800869
   # Should work without purchase
   ```

4. **Video Upload (TODO):**
   - Upload video with validated code
   - Process and generate report
   - Mark code as used
   - Store report data

## Current Status

### ✅ Completed
- Database schema with access_codes and code_usage tables
- Access code validation API (`/api/access-code/validate`)
- Stripe webhook handler for payment processing
- Purchase confirmation email with access code
- Simplified landing page with code entry
- Removed authentication requirements
- Admin code (800869) pre-configured

### 🚧 Remaining Work
- **Video upload integration** - Upload API needs to accept and validate access code
- **Time tracking** - Track video duration and enforce 1-hour limit
- **Report storage** - Save generated report to access_codes.report_data
- **Report retrieval** - Allow downloading report with used code
- **Error handling** - Add comprehensive error messages
- **Testing** - End-to-end testing of purchase → upload → report flow

## Key Files

- `supabase_schema.sql` - Database schema (RUN THIS FIRST!)
- `app/page-simple.client.js` - Simplified landing page
- `app/api/access-code/validate/route.js` - Code validation endpoint
- `app/api/webhook/route.js` - Stripe webhook handler (updated)
- `app/api/create-checkout-session/route.js` - Checkout API (no auth required)
- `lib/emails.js` - Email templates (added purchase confirmation)
- `middleware.js` - Updated to remove auth requirements

## Important Notes

1. **Non-refundable**: All purchases are final and non-refundable
2. **One-time use**: Each code can process one video (up to 1 hour)
3. **Report access**: Used codes can still access their generated report
4. **Admin code**: 800869 bypasses restrictions for testing
5. **Support email**: support@protocollm.org for customer issues

## Troubleshooting

### "Failed to validate code"
- Check that Supabase schema has been run
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check code format (must be 6 digits)

### "Email not received"
- Check RESEND_API_KEY is configured
- Verify FROM_EMAIL is set correctly
- Check Resend dashboard for delivery status

### "Webhook not working"
- Verify STRIPE_WEBHOOK_SECRET is correct
- Check webhook endpoint is accessible
- Review Stripe webhook logs for errors

## Contact

For issues or questions, contact: support@protocollm.org
