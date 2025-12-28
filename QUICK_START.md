# Quick Start Guide - Access Code System

## ⚡ Immediate Action Required

### 1. Run This SQL in Supabase (Copy & Paste)

```sql
-- ============================================================================
-- COPY THIS ENTIRE BLOCK INTO SUPABASE SQL EDITOR AND EXECUTE
-- ============================================================================

-- Create access_codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'unused',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_video_duration_seconds INTEGER DEFAULT 0,
  max_video_duration_seconds INTEGER DEFAULT 3600,
  report_data JSONB,
  report_generated_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_email ON access_codes(email);
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);

-- Create code_usage table
CREATE TABLE IF NOT EXISTS code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  video_duration_seconds INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_code_usage_code_id ON code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_code_usage_action_type ON code_usage(action_type);

-- Insert admin code
INSERT INTO access_codes (code, email, status, is_admin, max_video_duration_seconds)
VALUES ('800869', 'admin@protocollm.org', 'unused', true, 999999)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public code validation" ON access_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service role full access to access_codes" ON access_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access to code_usage" ON code_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Helper function
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(6)
LANGUAGE plpgsql
AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM access_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
```

### 2. Essential Environment Variables

Add these to your Railway/Vercel environment:

```bash
# Stripe - Get from Stripe Dashboard
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Payment Link - Create at https://dashboard.stripe.com/payment-links
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...

# Email - Get from https://resend.com
RESEND_API_KEY=re_...
FROM_EMAIL=protocolLM <support@protocollm.org>

# Supabase - You already have these
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App URL
NEXT_PUBLIC_BASE_URL=https://protocollm.org
```

### 3. Create Stripe Payment Link

1. Go to https://dashboard.stripe.com/payment-links
2. Click "New" → "One-time payment"
3. Set price: **$149.00 USD**
4. Product name: "Restaurant Health Inspection Report"
5. **Important:** Enable "Collect customer email address"
6. Save and copy the payment link URL
7. Add to env: `NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...`

### 4. Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://protocollm.org/api/webhook`
3. Select events: `checkout.session.completed`
4. Copy signing secret → Set `STRIPE_WEBHOOK_SECRET=whsec_...`

## 🧪 Testing

### Test with Admin Code

1. Go to https://protocollm.org
2. Enter code: `800869`
3. Click "Continue"
4. You should see the upload interface

### Test Purchase Flow

1. Click "Purchase License ($149)"
2. Use Stripe test card: `4242 4242 4242 4242`
3. Check your email for the 6-digit code
4. Enter the code on the website
5. Upload interface should appear

## 📊 What Happens

1. **User purchases** → Stripe Payment Link
2. **Payment succeeds** → Webhook triggers
3. **System generates** → 6-digit access code
4. **Email sent** → Code delivered to customer
5. **User enters code** → Validates and grants access
6. **User uploads video** → (TODO: needs integration)
7. **Video processes** → (TODO: needs integration)
8. **Code marked used** → Can still view report
9. **User returns later** → Enter same code to download report

## ⚠️ What's Not Done Yet

The following features need to be completed:

1. **Video Upload Integration**
   - Upload API needs to accept `accessCode` parameter
   - Validate code before processing
   - Track video duration
   - Mark code as 'used' when done

2. **Report Storage**
   - Save generated report to `access_codes.report_data`
   - Set `access_codes.report_generated_at`
   - Update `access_codes.status = 'used'`

3. **Report Retrieval**
   - When user enters used code, load report from database
   - Show "Download Report" instead of upload interface
   - Implement PDF download from `report_data`

## 🔑 Admin Code

- **Code:** 800869
- **Purpose:** Testing without payment
- **Limit:** Unlimited (bypasses all restrictions)
- **Change:** Update in Supabase `access_codes` table if needed

## 💌 Support Email

All customer issues should go to: **support@protocollm.org**

Users will see this email on:
- Landing page
- Purchase confirmation email
- Error messages

## 🐛 Common Issues

**"Invalid access code"**
- Check SQL was run in Supabase
- Verify code is exactly 6 digits
- Check SUPABASE_SERVICE_ROLE_KEY is set

**"Payment link not configured"**
- Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK
- Verify URL starts with https://buy.stripe.com/

**"No email received"**
- Check Resend API key
- Verify FROM_EMAIL is set
- Check spam folder
- View Resend dashboard for delivery logs

**"Webhook not working"**
- Verify STRIPE_WEBHOOK_SECRET
- Check endpoint is accessible
- Review Stripe webhook logs

## 📚 Full Documentation

For complete details, see: `SETUP_ACCESS_CODE_SYSTEM.md`

## 🎯 Next Sprint Tasks

1. Update `/api/upload/*` to accept accessCode
2. Validate code at start of upload
3. Track video duration during processing
4. Store report in access_codes table
5. Add report retrieval functionality
6. Test complete end-to-end flow
7. Handle error cases gracefully

---

**Need help?** Review SETUP_ACCESS_CODE_SYSTEM.md or contact support@protocollm.org
