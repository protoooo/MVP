# Small Business Suite - Environment Variables

This document lists the environment variables required for the Small Business Suite features.

## Required Environment Variables

### Email System (Resend)
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=ProtocolLM <noreply@protocollm.org>
```

### Payments (Stripe)
```env
STRIPE_SECRET_KEY=sk_test_xxxxxx  # Use sk_live_xxx for production
```

### Realtime Features (Supabase)
```env
# Backend
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Frontend
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Database (PostgreSQL with pgvector)
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Optional Environment Variables

### Email Configuration
```env
RESEND_SUPPORT_EMAIL=support@protocollm.org
```

### API Configuration
```env
NEXT_PUBLIC_API_URL=http://localhost:3001  # Backend URL for frontend
BACKEND_PORT=3001
```

## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Get Resend API Key:**
   - Sign up at https://resend.com
   - Create an API key
   - Verify your sending domain (optional for production)

3. **Get Stripe Keys:**
   - Sign up at https://stripe.com
   - Get your test keys from the Dashboard
   - Use live keys only in production

4. **Get Supabase Credentials:**
   - Create a project at https://supabase.com
   - Enable pgvector extension
   - Copy URL and keys from Settings > API

5. **Database Setup:**
   - Ensure PostgreSQL 14+ with pgvector extension is installed
   - Migrations will run automatically on server startup

## Feature Availability

Features will gracefully degrade if environment variables are not set:

- **Without RESEND_API_KEY:** Email sending will fail but won't crash the app
- **Without STRIPE_SECRET_KEY:** Payment intents cannot be created
- **Without SUPABASE credentials:** Realtime features will be unavailable, but core functionality remains

## Testing

To test that all environment variables are properly configured:

```bash
npm run dev
```

Check the console output for:
- ✅ Supabase storage ready
- ✅ Database schema created successfully
- ⚠️ Warnings for any missing optional configurations
