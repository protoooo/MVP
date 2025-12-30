# Deployment Checklist for ProtocolLM

## Pre-Deployment Setup

### 1. Supabase Configuration

#### A. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and keys

#### B. Run Database Migration
1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/001_create_user_profiles.sql`
3. Run the migration
4. Verify `user_profiles` table is created
5. Check that RLS policies are enabled

#### C. Enable Email Authentication
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates (optional)

### 2. Stripe Configuration

#### A. Create Products
1. Go to Stripe Dashboard > Products
2. Create product: "ProtocolLM Image Compliance"
3. Add 3 recurring prices:

**Price 1: Starter**
- Amount: $25 USD
- Billing period: Monthly
- **Lookup key**: `protocollm_image_200_monthly`

**Price 2: Professional**
- Amount: $50 USD
- Billing period: Monthly
- **Lookup key**: `protocollm_image_500_monthly`

**Price 3: Enterprise**
- Amount: $100 USD
- Billing period: Monthly
- **Lookup key**: `protocollm_image_1500_monthly`

⚠️ **CRITICAL**: The lookup keys MUST match exactly as shown above.

#### B. Configure Webhook
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/subscription/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret

### 3. Environment Variables

Create `.env.local` file with these variables:

```bash
# Supabase (from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# Stripe (from Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price Lookup Keys (use these exact values)
STRIPE_PRICE_ID_200_MONTHLY=protocollm_image_200_monthly
STRIPE_PRICE_ID_500_MONTHLY=protocollm_image_500_monthly
STRIPE_PRICE_ID_1500_MONTHLY=protocollm_image_1500_monthly

# Cohere (for AI analysis)
COHERE_API_KEY=your_cohere_key

# Application
NEXT_PUBLIC_BASE_URL=https://your-domain.com # or http://localhost:3000 for dev
```

### 4. Email Service (Optional)

If you want to enable email delivery:

#### Option A: Resend
1. Sign up at https://resend.com
2. Add to `.env.local`: `RESEND_API_KEY=re_...`
3. Update `lib/emailService.js` to use Resend (see comments)

#### Option B: SendGrid
1. Sign up at https://sendgrid.com
2. Add to `.env.local`: `SENDGRID_API_KEY=SG...`
3. Update `lib/emailService.js` to use SendGrid (see comments)

## Deployment Steps

### Local Testing

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

**Test Flow:**
1. Sign up for new account
2. Subscribe to a plan (use Stripe test cards)
3. Upload images
4. Verify quota tracking
5. Check PDF generation

### Production Deployment

#### Option 1: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Update NEXT_PUBLIC_BASE_URL to production URL
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up

# Set environment variables in Railway dashboard
```

#### Option 3: Docker
```bash
# Build
docker build -t protocollm .

# Run
docker run -p 3000:3000 --env-file .env.local protocollm
```

## Post-Deployment Verification

### 1. Test User Flow
- [ ] Navigate to homepage
- [ ] Click "Sign Up"
- [ ] Create account with test email
- [ ] Verify account (check email)
- [ ] Navigate back to homepage
- [ ] Click "Subscribe" on a plan
- [ ] Complete Stripe checkout (test mode)
- [ ] Verify redirect to /upload
- [ ] Check quota is displayed correctly

### 2. Test Image Upload
- [ ] Upload 1-3 test images
- [ ] Verify quota decrements
- [ ] Check PDF is generated
- [ ] Download PDF and review
- [ ] Test email delivery (if configured)

### 3. Test Quota Enforcement
- [ ] Try to upload more than quota allows
- [ ] Verify upload is blocked
- [ ] Check error message is clear

### 4. Verify Webhook
- [ ] Check Stripe webhook dashboard
- [ ] Verify successful deliveries
- [ ] Test subscription update
- [ ] Test subscription cancellation

### 5. Database Verification
```sql
-- Check user profile was created
SELECT * FROM user_profiles;

-- Verify usage tracking
SELECT 
  email,
  current_plan,
  monthly_image_limit,
  images_used_this_period,
  subscription_status
FROM user_profiles;
```

## Common Issues & Solutions

### Issue: "Authentication required"
**Solution:** 
- Check Supabase URL and keys are correct
- Verify user is logged in
- Check cookies are enabled

### Issue: Webhook not working
**Solution:**
- Verify webhook URL is correct
- Check webhook secret matches
- Ensure all required events are selected
- Check Stripe dashboard for errors

### Issue: Unknown price ID error
**Solution:**
- Verify price lookup keys match exactly
- Check environment variables are set
- Ensure prices are in "live" mode if using live keys

### Issue: Email not sending
**Solution:**
- Email service is a placeholder by default
- Configure email provider in `lib/emailService.js`
- Add provider API key to environment variables
- Check logs for configuration warnings

### Issue: Quota not resetting
**Solution:**
- Verify webhook is receiving `invoice.payment_succeeded`
- Check billing cycle dates in database
- Test with Stripe CLI: `stripe trigger invoice.payment_succeeded`

## Monitoring & Maintenance

### Regular Tasks
1. Monitor Stripe dashboard for failed payments
2. Check Supabase usage and storage
3. Review Cohere API usage and costs
4. Check application logs for errors

### Monthly
1. Review subscription metrics
2. Check for abandoned carts
3. Monitor quota usage patterns
4. Review support requests

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Cohere Docs**: https://docs.cohere.com

## Emergency Contacts

If you need to roll back or disable features:

### Disable Subscriptions
Set in environment:
```bash
SUBSCRIPTIONS_DISABLED=true
```

### Emergency Database Access
```sql
-- Manually add quota to user
UPDATE user_profiles 
SET monthly_image_limit = monthly_image_limit + 100
WHERE email = 'user@example.com';

-- Reset usage
UPDATE user_profiles 
SET images_used_this_period = 0
WHERE email = 'user@example.com';
```

---

**Questions?** Review the README.md and IMPLEMENTATION_SUMMARY.md files for detailed information.
