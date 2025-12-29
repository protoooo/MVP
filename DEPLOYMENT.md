# Deployment Guide - Michigan Food Safety Compliance API

This guide will help you deploy the pure API/Webhook compliance engine to Railway with Supabase and Stripe integration.

## Prerequisites

- Railway account (https://railway.app)
- Supabase account (https://supabase.com)
- Stripe account (https://stripe.com)
- Cohere account (https://cohere.com)

## Step 1: Database Setup (Supabase)

1. Create a new Supabase project
2. Go to SQL Editor in your Supabase dashboard
3. Run the schema from `database/schema-payment-based.sql`
4. Note your:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service role key (SUPABASE_SERVICE_ROLE_KEY)

## Step 2: Cohere API Setup

1. Sign up at https://cohere.com
2. Create an API key
3. Note your API key (COHERE_API_KEY)
4. Models used:
   - Vision: c4ai-aya-vision-32b
   - Rerank: rerank-v4.0-pro
   - Embed: embed-v4.0

## Step 3: Stripe Configuration

### A. Create Prepaid Products

1. Go to Stripe Dashboard → Products → Create product
2. Create three one-time payment products:

**Starter Pack**
- Name: "Starter - 1,000 Images"
- Price: $39 (one-time)
- Metadata:
  - `type`: `api_credits`
  - `tier`: `starter`
  - `credits`: `1000`

**Pro Pack**
- Name: "Pro - 10,000 Images"
- Price: $349 (one-time)
- Metadata:
  - `type`: `api_credits`
  - `tier`: `pro`
  - `credits`: `10000`

**Enterprise Pack**
- Name: "Enterprise - 100,000 Images"
- Price: $3,000 (one-time)
- Metadata:
  - `type`: `api_credits`
  - `tier`: `enterprise`
  - `credits`: `100000`

3. Create Payment Links for each product
4. Copy the Payment Link URLs

### B. Create Subscription Products

1. Create three monthly subscription products:

**Growth Subscription**
- Name: "Growth Plan"
- Price: $99/month
- Metadata:
  - `type`: `api_subscription`
  - `tier`: `growth`
  - `included`: `3000`
  - `extra_rate`: `0.03`

**Chain Subscription**
- Name: "Chain Plan"
- Price: $499/month
- Metadata:
  - `type`: `api_subscription`
  - `tier`: `chain`
  - `included`: `20000`
  - `extra_rate`: `0.025`

**Enterprise Subscription**
- Name: "Enterprise Plan"
- Price: $1,999/month
- Metadata:
  - `type`: `api_subscription`
  - `tier`: `enterprise_sub`
  - `unlimited`: `true`

2. Create Payment Links for each subscription
3. Copy the Payment Link URLs

### C. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app-name.up.railway.app/api/billing/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

## Step 4: Railway Deployment

### A. Initial Setup

1. Push your code to GitHub
2. Go to Railway Dashboard
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Next.js and configure build settings

### B. Environment Variables

Add the following environment variables in Railway:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere AI
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro

# Stripe
STRIPE_SECRET_KEY=sk_live_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Payment Links - Prepaid
NEXT_PUBLIC_STRIPE_LINK_STARTER=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_PRO=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE=https://buy.stripe.com/...

# Stripe Payment Links - Subscriptions
NEXT_PUBLIC_STRIPE_LINK_GROWTH=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_CHAIN=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB=https://buy.stripe.com/...

# Application
NEXT_PUBLIC_BASE_URL=https://your-app-name.up.railway.app
```

### C. Deploy

1. Railway will automatically build and deploy
2. Wait for deployment to complete
3. Note your Railway URL: `https://your-app-name.up.railway.app`

### D. Update Stripe Webhook

1. Go back to Stripe Dashboard → Webhooks
2. Update the endpoint URL with your Railway URL
3. Test the webhook endpoint

## Step 5: Configure Email Delivery (Optional)

For sending API keys via email, integrate an email service:

1. **SendGrid** (recommended)
   ```bash
   npm install @sendgrid/mail
   ```
   Add env: `SENDGRID_API_KEY`

2. **AWS SES**
   ```bash
   npm install @aws-sdk/client-ses
   ```
   Add env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

3. Update `/app/api/generate-api-key/route.js` to send emails

## Step 6: Testing

### Test API Endpoint

```bash
# Test with placeholder data
curl -X POST https://your-app-name.up.railway.app/api/audit-photos \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/test.jpg"],
    "api_key": "sk_test_key"
  }'
```

Expected response: `401 Unauthorized` (until you have a valid API key)

### Test Purchase Flow

1. Visit your Railway URL
2. Click "Buy Now" on a prepaid pack
3. Complete test payment (use Stripe test card: 4242 4242 4242 4242)
4. Check Supabase `api_keys` table for new entry
5. Check email for API key (if email is configured)

### Test Webhook

1. Make a test purchase
2. Check Railway logs for webhook processing
3. Verify API key was generated in database

## Step 7: Production Checklist

- [ ] Switch Stripe to live mode (live keys)
- [ ] Update webhook endpoint to use live mode
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring (Railway provides built-in monitoring)
- [ ] Configure email service for API key delivery
- [ ] Test full purchase → API key → API call flow
- [ ] Review Cohere API rate limits and costs
- [ ] Set up error alerting (optional: Sentry, LogRocket)

## Step 8: Monitoring & Maintenance

### Railway Monitoring

- View logs in Railway dashboard
- Monitor resource usage (CPU, memory)
- Set up auto-scaling if needed

### Supabase Monitoring

- Monitor database size and connections
- Review API usage
- Check for slow queries

### Stripe Monitoring

- Monitor successful payments
- Handle failed payment notifications
- Review webhook delivery logs

### Cohere Monitoring

- Track API usage and costs
- Monitor rate limits
- Review analysis accuracy

## Cost Estimation

### Per 1,000 Images Processed:

- **Cohere Vision**: ~$10 (c4ai-aya-vision-32b)
- **Cohere Embed**: ~$0.10 (for regulation search)
- **Cohere Rerank**: ~$2 (for citation ranking)
- **Supabase**: Free tier up to 500MB, then $25/month
- **Railway**: Free tier for small projects, ~$5-20/month for production
- **Total Cost**: ~$12.10 per 1,000 images

### Revenue (Starter Pack):
- 1,000 images @ $39 = **$39**
- Profit: $26.90 per 1,000 images (**68% margin**)

## Troubleshooting

### Build Fails
- Check Railway logs for errors
- Ensure all environment variables are set
- Verify Node.js version compatibility (20.x)

### Webhook Not Working
- Verify webhook secret is correct
- Check Railway URL is accessible
- Review Stripe webhook logs
- Ensure endpoint returns 200 status

### API Returns 500 Error
- Check Railway logs for error details
- Verify Supabase connection
- Check Cohere API key is valid
- Review environment variables

### Credits Not Deducted
- Check `api_keys` table in Supabase
- Review `/api/audit-photos` route logic
- Check webhook processed successfully

## Support

For issues:
1. Check Railway logs
2. Review Stripe webhook logs
3. Check Supabase logs
4. Review README.md for API documentation

## Security Notes

- Never commit `.env.local` or real API keys to git
- Use Stripe test mode for development
- Enable RLS on Supabase tables
- Implement rate limiting for production (optional)
- Monitor for unusual API usage patterns
