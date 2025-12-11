# protocolLM - Food Safety Compliance Platform

LLM powered compliance assistant for Washtenaw County restaurants. Analyzes facility photos and answers Michigan Food Code questions.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Vector Search)
- **AI**: OpenAI GPT-4 + Embeddings
- **Payments**: Stripe (Subscriptions + Webhooks)
- **Security**: Cloudflare Turnstile, CSRF Protection
- **Hosting**: Railway

## 📋 Prerequisites

- Node.js 20+
- npm 10+
- Supabase account (with pgvector extension)
- OpenAI API key (with GPT-4 access)
- Stripe account (with webhook endpoint)
- Cloudflare Turnstile keys

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
git clone <repo-url>
cd protocollm
npm install --legacy-peer-deps
```

### 2. Environment Variables
Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL=price_...

# App
NEXT_PUBLIC_BASE_URL=https://protocollm.org
ADMIN_EMAIL=your@email.com

# Security (Cloudflare Turnstile)
TURNSTILE_SECRET_KEY=0x4A...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4A...

# Optional
NODE_ENV=production
```

### 3. Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (handled by Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_terms BOOLEAN DEFAULT FALSE,
  accepted_privacy BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  is_subscribed BOOLEAN DEFAULT FALSE
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (RAG)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 20,
  filter_county text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 
    (filter_county IS NULL OR documents.metadata->>'county' = filter_county)
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  text_count INT DEFAULT 0,
  image_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook idempotency
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  device_info TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkout attempts (rate limiting)
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  price_id TEXT NOT NULL,
  captcha_score FLOAT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_counters(user_id);

-- RLS Policies (disable for service role operations)
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Policy examples (adjust as needed)
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own chats" ON chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);

-- Insert default feature flag
INSERT INTO feature_flags (flag_name, enabled, message)
VALUES ('service_enabled', true, 'Service is operational')
ON CONFLICT (flag_name) DO NOTHING;
```

### 4. Document Ingestion

Place PDF documents in `public/documents/washtenaw/`

Run ingestion script:
```bash
npm run ingest
```

This will:
- Parse PDFs
- Generate embeddings
- Upload to Supabase
- Create searchable vector index

### 5. Stripe Setup

1. Create products in Stripe Dashboard
2. Copy price IDs to `.env.local`
3. Set up webhook endpoint: `https://yourdomain.com/api/webhook`
4. Add webhook events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`

### 6. Development

```bash
npm run dev
```

Visit http://localhost:3000

### 7. Production Deployment (Railway)

1. Connect GitHub repo to Railway
2. Add environment variables (all from `.env.local`)
3. Railway will auto-deploy using `nixpacks.toml`

## 📁 Project Structure

```
protocollm/
├── app/
│   ├── api/              # API routes
│   │   ├── chat/         # Main chat endpoint
│   │   ├── auth/         # Authentication
│   │   ├── webhook/      # Stripe webhooks
│   │   └── health/       # Health check
│   ├── admin/            # Admin dashboard
│   ├── auth/             # Auth pages
│   ├── contact/          # Contact page
│   ├── privacy/          # Privacy policy
│   ├── terms/            # Terms of service
│   └── page.js           # Main app
├── components/           # React components
├── lib/                  # Utilities
│   ├── supabase-browser.js
│   ├── searchDocs.js     # RAG search
│   ├── usage.js          # Usage tracking
│   ├── logger.js         # Structured logging
│   └── captchaVerification.js
├── public/documents/     # PDF documents
└── scripts/              # Maintenance scripts
```

## 🔒 Security Features

- ✅ CSRF protection on all mutations
- ✅ Cloudflare Turnstile CAPTCHA
- ✅ Rate limiting on auth endpoints
- ✅ Input sanitization
- ✅ Session conflict detection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping)
- ✅ Security headers (CSP, HSTS, etc.)

## 🧪 Testing

### Health Check
```bash
curl https://yourdomain.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "checks": {
    "db": true,
    "env": true,
    "stripe": true,
    "openai": true
  }
}
```

### Document Search Test
Run a test query through the chat interface with an image or text question about Michigan Food Code.

## 📊 Monitoring

Key metrics to track:
- Response time: `/api/chat` (should be <30s)
- Error rate: Check Railway logs
- Stripe webhook delivery
- Usage counters accuracy
- OpenAI API costs

## 🐛 Troubleshooting

### "No active subscription" error
- Check Stripe webhook delivery
- Verify subscription status in Supabase
- Check grace period logic in `lib/usage.js`

### Document search returns no results
- Verify embeddings were generated (`npm run ingest`)
- Check pgvector extension is enabled
- Test `match_documents` function manually

### Image uploads fail
- Check max file size (10MB limit)
- Verify CORS settings
- Check OpenAI vision API access

## 💰 Pricing

Current plan:
- **Monthly**: $100/mo (unlimited usage)
- **Annual**: Contact for pricing
- **Trial**: 7 days free

## 📝 License

Proprietary - All rights reserved

## 👤 Support

Admin email: Set in `ADMIN_EMAIL` environment variable

## 🔄 Updates

Keep these updated:
- OpenAI SDK: `npm update openai`
- Supabase client: `npm update @supabase/supabase-js`
- Next.js: Check for security patches
- Stripe SDK: `npm update stripe`
