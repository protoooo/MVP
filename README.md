# protocolLM

> AI-powered food safety compliance assistant for Washtenaw County restaurants

Built with **OpenAI GPT-5.2** and **Cohere**

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <your-repo>
cd protocollm
npm install

# 2. Set up environment
cp .env.local.example .env.local
# Edit .env.local with your API keys

# 3. Run development server
npm run dev
# Open http://localhost:3000
```

## 📚 Documentation

- **[TECH_STACK.md](./TECH_STACK.md)** - Current architecture (OpenAI + Cohere)
- **[DOCUMENT_INGESTION.md](./DOCUMENT_INGESTION.md)** - How to ingest PDFs
- **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** - Deploy to production
- **[.env.local.example](./.env.local.example)** - Environment variables

## ⚡ Tech Stack

| Component | Service | Purpose |
|-----------|---------|---------|
| Chat | OpenAI GPT-5.2 | Generate compliance answers + vision |
| Embeddings | Cohere (`embed-english-v4.0`) | Document search (1024 dims) |
| Database | Supabase (pgvector) | Vector storage + auth |
| Hosting | Railway | App deployment |
| Payments | Stripe | Subscriptions |
| Email | Resend | Transactional emails |
| Security | Cloudflare Turnstile | CAPTCHA |

## 🔧 Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Documents
npm run ingest           # Ingest PDFs (uses Cohere)
npm run test-search      # Test document search

# Emails
npm run send-reminders   # Send trial reminder emails
npm run test-emails      # Test email templates
```

## 📦 Project Structure

```
protocollm/
├── app/
│   ├── api/
│   │   ├── chat/route.js              # ✅ OpenAI GPT-5.2
│   │   ├── health/route.js            # System health check
│   │   ├── webhook/route.js           # Stripe webhooks
│   │   └── auth/                      # Authentication endpoints
│   ├── admin/                         # Admin dashboard
│   ├── page.js                        # Main app UI
│   └── (legal pages)/                 # Terms, Privacy, Contact
├── lib/
│   ├── searchDocs.js                  # ✅ Cohere embeddings
│   ├── emails.js                      # Email templates
│   ├── logger.js                      # Structured logging
│   └── usage.js                       # Usage tracking
├── scripts/
│   ├── ingest-documents.js            # ✅ Cohere batch ingestion
│   └── send-trial-reminders.js        # Cron job
├── components/                        # React components
├── public/
│   └── documents/
│       └── washtenaw/                 # PDF documents here
└── docs/                              # Documentation
```

## 🔐 Environment Setup

### Required Variables

```bash
# AI Services
COHERE_API_KEY=...

# Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Security
TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...

# Email
RESEND_API_KEY=re_...
FROM_EMAIL=protocolLM <hello@protocollm.org>
```

See [.env.local.example](./.env.local.example) for complete list.

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 2. Create Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1024),  -- Cohere uses 1024 dims (NOT 1536!)
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector similarity function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1024),
  match_threshold FLOAT,
  match_count INT,
  filter_county TEXT
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
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
    (documents.metadata->>'county' = filter_county OR filter_county IS NULL)
    AND (1 - (documents.embedding <=> query_embedding)) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for fast search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. Create Other Tables
```sql
-- User profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  accepted_terms BOOLEAN DEFAULT FALSE,
  accepted_privacy BOOLEAN DEFAULT FALSE,
  is_subscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage counters
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan TEXT NOT NULL,
  plan_type TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  text_count INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 📄 Document Ingestion

### 1. Add PDF Documents
Place PDF files in: `public/documents/washtenaw/`

Recommended files:
- `violation-types.pdf` - Priority/Foundation/Core classifications
- `enforcement-actions.pdf` - Progressive enforcement procedures
- `michigan-food-code.pdf` - State regulations

### 2. Run Ingestion
```bash
npm run ingest
```

This will:
1. Extract text from PDFs
2. Split into 1000-character chunks
3. Generate embeddings with Cohere (1024 dims)
4. Store in Supabase with metadata

See [DOCUMENT_INGESTION.md](./DOCUMENT_INGESTION.md) for details.

## 🚢 Deployment

### Railway (Recommended)

1. **Connect GitHub repo** to Railway
2. **Set environment variables** in Railway dashboard
3. **Verify build** completes successfully
4. **Set up custom domain** (optional)
5. **Configure Stripe webhook** to production URL
6. **Add cron job** for trial reminders

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for step-by-step guide.

### Pre-Deployment Checklist

```bash
# 1. Run build locally
npm run build

# 2. Check environment variables
# See .env.local.example

# 3. Test health endpoint
npm run start
curl http://localhost:3000/api/health
```

## 🧪 Testing

### Health Check
```bash
curl https://protocollm.org/api/health
```

Expected response:
```json
{
  "status": "ok",
  "checks": {
    "db": true,
    "env": true,
    "stripe": true,
    "cohere": true
  }
}
```

### Chat Endpoint
```bash
curl -X POST https://protocollm.org/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is a Priority violation?"}]}'
```

### Document Search
```bash
npm run test-search
```

## 🐛 Troubleshooting

### Build fails with "Module not found"
**Fix:** 
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Vector search returns no results
**Fix:**
```sql
-- Check if documents exist
SELECT COUNT(*) FROM documents;

-- Check embedding dimensions
SELECT vector_dims(embedding) FROM documents LIMIT 1;
-- Should return 1024 (NOT 1536!)

-- Re-run ingestion if needed
npm run ingest
```

### "Expected 1536 dimensions, got 1024"
**Fix:**
```sql
ALTER TABLE documents DROP COLUMN embedding;
ALTER TABLE documents ADD COLUMN embedding VECTOR(1024);
DROP INDEX IF EXISTS documents_embedding_idx;
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
npm run ingest  -- Re-ingest documents
```

## 📊 Monitoring

### Health Check Endpoint
Monitor `/api/health` for:
- Database connectivity
- API key validity (OpenAI + Cohere)
- Stripe connection
- Email service

### Logs
Check Railway deployment logs for:
- API errors
- Rate limiting
- Database queries
- Webhook events

### Usage Tracking
Monitor in database:
```sql
SELECT 
  user_id,
  text_count,
  image_count,
  (text_count + (image_count * 2)) as total_units
FROM usage_counters
WHERE period_start > NOW() - INTERVAL '30 days';
```

## 💰 Cost Estimates

Monthly costs for moderate usage (500 requests):

| Service | Cost |
|---------|------|
| Railway (Pro) | $20 |
| OpenAI GPT-5.2 | $40-180 |
| Cohere | $5-20 |
| Supabase | $0 (free tier) |
| Stripe | 2.9% + $0.30/txn |
| Resend | $0 (< 3000 emails) |
| **Total** | **~$80-250/month** |

## 🔒 Security

- ✅ HTTPS only (Railway automatic)
- ✅ CSRF protection enabled
- ✅ Rate limiting (per IP)
- ✅ Cloudflare Turnstile CAPTCHA
- ✅ Input sanitization
- ✅ SQL injection prevention (Supabase parameterized queries)
- ✅ Environment variables never exposed to client
- ✅ Webhook signature verification (Stripe)

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

- **Email:** hello@protocollm.org
- **Documentation:** See `/docs` folder
- **Issues:** Create GitHub issue

## 🔄 Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes
# Edit files...

# 3. Test locally
npm run dev
# Test in browser: http://localhost:3000

# 4. Build and test
npm run build
npm run start

# 5. Commit and push
git add .
git commit -m "Add feature"
git push origin feature/your-feature

# 6. Create PR
# Railway will auto-deploy preview
```

## 📚 Additional Resources

- [Cohere Embeddings Guide](https://docs.cohere.com/docs/embeddings)
- [Supabase pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [Railway Deployment Docs](https://docs.railway.app)
- [Next.js 14 Documentation](https://nextjs.org/docs)

---

Made in Washtenaw County for Washtenaw County 🍽️


**code, project structure, and concept are proprietary and legal action will be taken if anything is stolen or reproduced**
