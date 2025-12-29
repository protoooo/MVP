# Stripe Setup Guide for Subscription Pricing

This guide explains how to configure Stripe to work with the new pricing tiers, including the Free tier.

## Overview

The application has 4 pricing tiers:
- **Free**: $0/month - 100 images (no Stripe required, direct API key generation)
- **Growth**: $99/month - 3,000 images
- **Chain**: $499/month - 20,000 images  
- **Enterprise**: $1,999/month - Unlimited images

## Required Environment Variables

You need to set these environment variables in your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Payment Links for Paid Tiers (Free tier doesn't need one)
NEXT_PUBLIC_STRIPE_LINK_GROWTH=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_CHAIN=https://buy.stripe.com/...
NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB=https://buy.stripe.com/...
```

## Step-by-Step Stripe Configuration

### 1. Create Subscription Products in Stripe

Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products) and create three monthly subscription products:

#### Growth Plan - $99/month
1. Click "Add product"
2. **Name**: `Growth Plan`
3. **Description**: `3,000 images per month included`
4. **Pricing model**: Standard pricing
5. **Price**: `$99.00`
6. **Billing period**: Monthly
7. **Add metadata** (click "Add metadata"):
   - `tier` = `growth`
   - `included` = `3000`
   - `type` = `subscription`
8. Click "Save product"

#### Chain Plan - $499/month
1. Click "Add product"
2. **Name**: `Chain Plan`
3. **Description**: `20,000 images per month included`
4. **Pricing model**: Standard pricing
5. **Price**: `$499.00`
6. **Billing period**: Monthly
7. **Add metadata**:
   - `tier` = `chain`
   - `included` = `20000`
   - `type` = `subscription`
8. Click "Save product"

#### Enterprise Plan - $1,999/month
1. Click "Add product"
2. **Name**: `Enterprise Plan`
3. **Description**: `Unlimited images per month`
4. **Pricing model**: Standard pricing
5. **Price**: `$1,999.00`
6. **Billing period**: Monthly
7. **Add metadata**:
   - `tier` = `enterprise_sub`
   - `unlimited` = `true`
   - `type` = `subscription`
8. Click "Save product"

### 2. Create Payment Links

For each product you just created:

1. Go to the product detail page
2. Click "Create payment link" button
3. Configure the payment link:
   - **Collect customer addresses**: Optional (recommended for tax purposes)
   - **Allow promotion codes**: Optional
   - **Require billing address**: Recommended
4. Click "Create link"
5. Copy the payment link URL (it will look like `https://buy.stripe.com/test_xxxxxxxxxxxxx`)
6. Add it to your `.env.local` file:
   - Growth → `NEXT_PUBLIC_STRIPE_LINK_GROWTH`
   - Chain → `NEXT_PUBLIC_STRIPE_LINK_CHAIN`
   - Enterprise → `NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB`

### 3. Configure Webhooks

Webhooks are required to automatically create API keys when customers subscribe:

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/billing/webhook`
   - Replace `your-domain.com` with your actual domain
   - Example: `https://protocollm.railway.app/api/billing/webhook`
4. **Description**: `Subscription and payment webhook`
5. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted` (optional, for handling cancellations)
6. Click "Add endpoint"
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add it to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 4. Test the Integration

#### Test with Free Tier (No Stripe Required)
1. Go to your landing page: `https://your-domain.com`
2. Click "Get Started Free" or the "Get Free API Key" button on the Free tier
3. Enter an email address
4. You should be redirected to `/dashboard/{keyId}` with your API key

#### Test with Paid Tiers (Requires Stripe)
1. In Stripe Dashboard, make sure you're in **Test mode** (toggle in top-right)
2. Use test payment links (they'll have `test_` in the URL)
3. Click on a paid tier subscription button
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete the checkout
6. Webhook should fire and create an API key
7. You should receive an email with your API key

### 5. Go Live

When ready for production:

1. **Switch to Live mode** in Stripe Dashboard
2. Create **live** versions of all products (repeat steps 1-2)
3. Get **live** API keys:
   - Replace `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
   - Replace `STRIPE_WEBHOOK_SECRET` with live webhook secret
4. Update payment link environment variables with live links
5. Update webhook endpoint URL to production domain
6. Test thoroughly before announcing

## Free Tier Details

The Free tier works differently from paid tiers:

- **No Stripe involved**: Clicking "Get Free API Key" opens a modal asking for email
- **Direct API key generation**: Submits email to `/api/generate-api-key` endpoint
- **Instant access**: User is redirected to dashboard immediately with their key
- **100 images/month**: Hard-coded limit in the tier configuration
- **No payment required**: Perfect for testing and evaluation

## Metadata Reference

The webhook handler (`/app/api/billing/webhook/route.js`) expects these metadata fields:

### For Subscriptions
- `tier`: Identifier for the plan (growth, chain, enterprise_sub)
- `included`: Number of images included per month
- `unlimited`: Set to "true" for unlimited plans
- `type`: Should be "subscription"

### For Prepaid Packs (if you add them later)
- `tier`: Identifier for the pack (starter, pro, enterprise)
- `credits`: Number of credits/images in the pack
- `type`: Should be "api_credits"

## Troubleshooting

### Subscription button shows alert instead of redirecting
**Problem**: Environment variable not set or incorrectly named

**Solution**: 
1. Check `.env.local` has the correct variable names
2. Restart your Next.js server after adding environment variables
3. Verify the environment variable is prefixed with `NEXT_PUBLIC_`

### Webhook not firing
**Problem**: Webhook endpoint not reachable or signature verification failing

**Solution**:
1. Check webhook endpoint URL is accessible (try visiting it in browser)
2. Verify `STRIPE_WEBHOOK_SECRET` matches the secret in Stripe Dashboard
3. Check webhook logs in Stripe Dashboard for error details

### API key not generated after payment
**Problem**: Webhook received but API key generation failed

**Solution**:
1. Check application logs for errors from `/api/generate-api-key`
2. Verify Supabase credentials are correct
3. Ensure `api_keys` table exists in database
4. Check that webhook handler is calling the generate-api-key endpoint

### Free tier not working
**Problem**: Modal doesn't appear or API key generation fails

**Solution**:
1. Check browser console for JavaScript errors
2. Verify `/api/generate-api-key` endpoint is accessible
3. Make sure Supabase is configured correctly
4. Test the endpoint directly with curl/Postman

## Support

If you encounter issues not covered here:
1. Check Stripe Dashboard → Developers → Logs for API errors
2. Check Stripe Dashboard → Webhooks → Your endpoint for webhook delivery status
3. Check your application logs for errors
4. Contact Stripe support for payment processing issues
