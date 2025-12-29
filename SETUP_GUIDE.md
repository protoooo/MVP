# Quick Setup Guide

## 1. Database Setup

1. Log into your Supabase project
2. Go to SQL Editor
3. Run the SQL from `database/schema-payment-based.sql`
4. This creates two new tables:
   - `api_keys` - Stores API keys and credits
   - `one_off_reports` - Tracks $50 report payments

## 2. Stripe Setup

### Create Products for API Credits

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click "Create product"

**Product 1: 500 Images**
- Name: "Food Safety API - 500 Images"
- Price: $49 (one-time)
- Metadata:
  - `tier` = `small`
  - `credits` = `500`
  - `type` = `api_credits`
- Create Payment Link → Copy URL to `NEXT_PUBLIC_STRIPE_LINK_500`

**Product 2: 5,000 Images**
- Name: "Food Safety API - 5,000 Images"
- Price: $399 (one-time)
- Metadata:
  - `tier` = `medium`
  - `credits` = `5000`
  - `type` = `api_credits`
- Create Payment Link → Copy URL to `NEXT_PUBLIC_STRIPE_LINK_5000`

**Product 3: 500,000 Images**
- Name: "Food Safety API - 500,000 Images"
- Price: $3,499 (one-time)
- Metadata:
  - `tier` = `large`
  - `credits` = `500000`
  - `type` = `api_credits`
- Create Payment Link → Copy URL to `NEXT_PUBLIC_STRIPE_LINK_500K`

### Configure Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.railway.app/api/billing/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
5. Copy "Signing secret" to `STRIPE_WEBHOOK_SECRET`

## 3. Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in all the values:
   - Stripe keys from dashboard
   - Payment Link URLs from step 2
   - Supabase credentials
   - Cohere API key

## 4. Test Locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000/simple to see the new payment-based UI.

## 5. Deploy to Railway

```bash
git push origin main
```

Make sure to set all environment variables in Railway dashboard:
- Settings → Variables → Add all from `.env.local`

## 6. Test Payment Flow

### Test $50 Report:
1. Go to `/simple`
2. Upload test images
3. Click "Generate Report ($50)"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Should redirect to success page

### Test API Purchase:
1. Go to `/simple`
2. Click "500 images - $49"
3. Complete payment with test card
4. Check database for new API key
5. Check logs/email for API key delivery

## 7. Test API Endpoint

Once you have an API key (from database or email):

```bash
curl -X POST https://your-app.railway.app/api/audit-photos \
  -H "X-Api-Key: sk_your_generated_api_key" \
  -F "files=@test-image.jpg" \
  -F "location=kitchen"
```

Should return JSON with compliance analysis.

## Troubleshooting

**Webhook not working?**
- Check webhook secret is correct
- Verify endpoint URL matches your Railway app
- Check Railway logs for webhook errors

**API key not generated?**
- Check Stripe metadata on products
- Verify webhook received `checkout.session.completed`
- Check Supabase for API key entry

**Credits not deducting?**
- Check API key is active in database
- Verify API endpoint logic
- Check logs for errors

**Email not sent?**
- Email sending is a placeholder - implement with SendGrid/AWS SES
- For now, retrieve API keys from database directly
