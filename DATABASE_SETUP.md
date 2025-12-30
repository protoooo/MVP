# Database Setup Guide

## Prerequisites

- Supabase project created
- Database access configured

## Setup Steps

### 1. Run Migrations

Execute the SQL migration file in your Supabase SQL editor:

```bash
# File: supabase/migrations/001_create_user_profiles.sql
```

This will:
- Create the `user_profiles` table
- Set up Row Level Security (RLS) policies
- Create indexes for performance
- Set up auto-update trigger for `updated_at`
- Create trigger to auto-create profile on user signup

### 2. Verify Tables

Ensure these tables exist:
- `user_profiles` - Subscription and quota management
- `analysis_sessions` - (Existing) Analysis session tracking
- `payments` - (Existing) Payment records
- `violations` - (Existing) Violation details

### 3. Enable RLS

Row Level Security should be enabled on `user_profiles`:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';
```

### 4. Test Policies

Test that users can only access their own profile:

```sql
-- As authenticated user, should only see own profile
SELECT * FROM user_profiles;
```

## User Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | User ID (references auth.users) |
| `email` | TEXT | User email address |
| `stripe_customer_id` | TEXT | Stripe customer ID |
| `stripe_subscription_id` | TEXT | Stripe subscription ID |
| `current_plan` | TEXT | Plan name (starter/professional/enterprise) |
| `monthly_image_limit` | INTEGER | Monthly image quota |
| `images_used_this_period` | INTEGER | Images used in current billing cycle |
| `billing_cycle_start` | TIMESTAMP | Billing cycle start date |
| `billing_cycle_end` | TIMESTAMP | Billing cycle end date |
| `subscription_status` | TEXT | Subscription status (active/past_due/cancelled) |
| `created_at` | TIMESTAMP | Profile creation date |
| `updated_at` | TIMESTAMP | Last update date |

## Stripe Webhook Events

The subscription webhook handles these events to update the database:

1. **checkout.session.completed** - Creates/updates user profile with subscription
2. **customer.subscription.updated** - Updates subscription details
3. **customer.subscription.deleted** - Marks subscription as cancelled
4. **invoice.payment_succeeded** - Resets image usage for new billing cycle
5. **invoice.payment_failed** - Marks subscription as past_due

## Testing Locally

1. Create a test user via Supabase Auth UI or API
2. Verify profile is auto-created in `user_profiles`
3. Test Stripe webhook with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
stripe trigger checkout.session.completed
```

## Production Checklist

- [ ] Migrations run successfully
- [ ] RLS policies enabled and tested
- [ ] Stripe webhook endpoint configured
- [ ] Webhook secret added to environment variables
- [ ] Test subscription flow end-to-end
- [ ] Test quota enforcement
- [ ] Test usage reset on billing cycle
