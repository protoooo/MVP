# Database Setup for Native Integrations

## Required Supabase Tables

### 1. Integrations Table

Run the migration file `supabase/migrations/20250101_add_integrations.sql` in your Supabase SQL Editor.

This will create:
- `integrations` table for storing OAuth tokens and sync status
- Add `tier` column to `subscriptions` table (basic/pro)
- Set up RLS policies for security

### 2. Manual Setup (Alternative)

If you prefer to set up manually, here's what you need:

#### Integrations Table

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('jolt', 'lightspeed')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);
```

#### Update Subscriptions Table

```sql
ALTER TABLE subscriptions ADD COLUMN tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'pro'));
```

## Required Environment Variables

Add these to your Railway/deployment environment:

```env
# Jolt Integration
JOLT_CLIENT_ID=your_jolt_client_id
JOLT_CLIENT_SECRET=your_jolt_client_secret

# Lightspeed Integration
LIGHTSPEED_WEBHOOK_SECRET=your_lightspeed_webhook_secret

# Existing Stripe - Add Pro tier price
STRIPE_PRICE_PRO_MONTHLY=price_xxx  # Your Stripe Pro tier price ID ($99/mo)
```

## Stripe Setup

Create two subscription tiers in Stripe:

1. **Basic Plan** ($49/mo)
   - Web app access only
   - Photo upload and audit features
   - PDF reports

2. **Pro Plan** ($99/mo)
   - Everything in Basic
   - API key generation
   - Native integrations (Jolt, Lightspeed)
   - Webhook access

## Features by Tier

| Feature | Basic | Pro |
|---------|-------|-----|
| Web App | ✓ | ✓ |
| Photo Upload | ✓ | ✓ |
| PDF Reports | ✓ | ✓ |
| API Keys | ✗ | ✓ |
| Jolt Integration | ✗ | ✓ |
| Lightspeed Webhook | ✗ | ✓ |
| Webhook Access | ✗ | ✓ |

## Testing

1. Sign up for an account
2. Subscribe to Pro tier
3. Generate an API key in dashboard
4. Connect Jolt integration
5. Test Lightspeed webhook with payload:

```json
{
  "user_id": "your-user-uuid",
  "images": ["https://example.com/photo.jpg"],
  "location": "cooler"
}
```
