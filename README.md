# ProtocolLM - Unlimited Intelligent Document Storage

ProtocolLM is a powerful document storage and retrieval system that enables you to store unlimited documents and find anything instantly using semantic search. Built with Cohere AI, Supabase, and advanced security features.

## 🚀 Key Features

- **Unlimited Storage** - Store terabytes of documents with Supabase
- **Semantic Search** - Find documents using vague wording and natural language
- **Advanced Retrieval** - Cohere Rerank ensures you find exactly what you need
- **Document Generation** - Summarize and generate reports from thousands of pages
- **Multi-Format Support** - PDFs, images, Word docs, Excel, text files, and more
- **OCR Processing** - Automatic text extraction from images and scanned documents
- **Enterprise Security** - Cloudflare Turnstile protection and encryption
- **AI-Powered Intelligence** - Cohere Embed, Rerank, AYA Vision, and Command models

## 📋 Use Cases

### Legal & Financial
- Quickly find specific clauses across thousands of contracts
- Search tax documents from specific years with exact figures
- Retrieve financial statements and invoices by amount or date

### Business Operations
- Find procedures and SOPs using natural language
- Search through employee handbooks for specific policies
- Locate safety protocols and compliance documents

### Property Management
- Find before/after photos by property name
- Retrieve inspection reports and maintenance records
- Search invoices by vendor, amount, or time period

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** with App Router and React 19
- **TypeScript** for type safety
- **Tailwind CSS** with custom dark theme
- **Radix UI** components

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** with pgvector extension
- **Supabase** for unlimited scalable storage
- **JWT** authentication with bcrypt

### AI/ML (Cohere)
- **Embed v4** - 1536-dimension text embeddings for semantic search
- **Rerank v4.0 Pro** - Advanced result reranking
- **Command-R7b** - Natural language understanding and metadata generation
- **AYA Vision** - Image analysis and understanding
- **Tesseract.js** - OCR for text extraction

### Security
- **Cloudflare Turnstile** - Bot protection
- **Encryption** - At rest and in transit
- **Secure authentication** - JWT tokens with httpOnly cookies

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Cohere API key ([get one here](https://cohere.com))
- Supabase account ([sign up here](https://supabase.com))
- Cloudflare Turnstile keys ([get them here](https://dash.cloudflare.com))

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/protocollm.git
cd protocollm
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Cohere AI
COHERE_API_KEY=your_cohere_api_key

# Supabase
DATABASE_URL=postgresql://user:password@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare Turnstile
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key

# JWT
JWT_SECRET=your_random_secret_min_32_chars
```

4. **Start the development servers**
```bash
npm run dev
```

The application will:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Auto-initialize database schema
- Set up Supabase storage bucket

5. **Create your account and start uploading!**

## 📖 Documentation

### How Semantic Search Works

ProtocolLM uses advanced semantic search to understand what you're looking for, even with vague wording:

1. **Upload** - Documents are processed with OCR and AI analysis
2. **Embed** - Text is converted to 1536-dimension vectors using Cohere Embed v4
3. **Store** - Vectors are stored in PostgreSQL with pgvector
4. **Search** - Your query is converted to a vector and compared
5. **Rerank** - Results are reranked using Cohere Rerank v4.0 Pro for maximum relevance
6. **Retrieve** - Get exactly what you need with relevance scores

### Search Examples

```
"What were my capital gains in 2017?"
→ Finds tax documents, extracts specific figures

"Show me before photos of Johnson property"
→ Finds images tagged with property name and "before"

"Find invoices over $5000 from Q2 2023"
→ Searches by amount and time period

"What are our safety procedures for equipment?"
→ Finds SOPs and manuals with semantic understanding
```

### Document Generation

Generate comprehensive reports from your documents:

```javascript
// Summarize multiple documents
"Summarize my last 10 tax returns"

// Compare across time periods
"Compare Q1 and Q2 expenses"

// Extract insights
"What are the key takeaways from all safety reports?"
```

## 🏗️ Architecture

### Storage System

- **Supabase Storage** - Unlimited scalable file storage
- **PostgreSQL** - Metadata and vector embeddings
- **pgvector** - High-performance vector similarity search

### AI Pipeline

```
Upload → OCR (Tesseract) → Text Extraction → 
Cohere Embed v4 → Vector Storage → 
Cohere Rerank → Results
```

### Security Layers

1. **Cloudflare Turnstile** - Bot protection on forms
2. **JWT Authentication** - Secure token-based auth
3. **Encryption** - All data encrypted at rest and in transit
4. **Rate Limiting** - Prevent abuse
5. **Input Validation** - Sanitize all inputs

## 💰 Pricing

### Personal - $5/month
- 500GB storage
- Unlimited documents
- Semantic search
- Document generation
- Mobile app access
- Email support

### Business - $25/month
- 5TB storage
- Everything in Personal
- Team workspaces
- Priority support
- Bulk operations
- Advanced analytics
- API access

### Enterprise - Custom
- Unlimited storage
- Everything in Business
- SSO/SAML
- Custom AI models
- Dedicated support
- SLA guarantee
- On-premise option

## 🔧 Configuration

### Environment Variables

```env
# Required
COHERE_API_KEY=           # Cohere AI API key
DATABASE_URL=             # PostgreSQL connection string
SUPABASE_URL=             # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
JWT_SECRET=               # JWT signing secret (min 32 chars)

# Optional
CLOUDFLARE_TURNSTILE_SECRET_KEY=     # Turnstile secret
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY= # Turnstile site key
MAX_FILE_SIZE=524288000   # Max file size (500MB default)
```

### Cohere Models

```env
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro
COHERE_TEXT_MODEL=command-r7b-12-2024
COHERE_VISION_MODEL=c4ai-aya-vision-32b
```

## 🚀 Deployment

### Railway (Recommended)

**Single Deployment Setup** (Frontend + Backend on one service):

1. **Create a Railway project**
   - Go to [Railway](https://railway.app) and create a new project
   
2. **Add PostgreSQL with pgvector**
   - Add PostgreSQL from Railway marketplace
   - The `DATABASE_URL` will be automatically set
   - After deployment, enable pgvector extension in your database

3. **Set environment variables** (in Railway dashboard):
   ```bash
   # Port (Railway provides this automatically, defaults to 3000)
   PORT=3000
   
   # Backend will run on internal port 3001 (hardcoded in start script)
   
   # Required
   JWT_SECRET=your_32_character_or_longer_secret_key
   COHERE_API_KEY=your_cohere_api_key
   
   # Database (automatically set by Railway PostgreSQL)
   DATABASE_URL=postgresql://...
   
   # Optional but recommended
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key
   NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key
   ```

4. **Deploy from GitHub**
   - Connect your GitHub repository
   - Railway will automatically detect `nixpacks.toml`
   - Both frontend and backend will build and start together

5. **Access your app**
   - Frontend: Your Railway URL (e.g., `https://yourapp.railway.app`)
   - Backend API: Same URL + `/api` (e.g., `https://yourapp.railway.app/api`)
   - Health check: `https://yourapp.railway.app/health`

**How it works:**
- The app uses a single deployment with both services running
- Frontend (Next.js) runs on the public PORT
- Backend (Express) runs on internal port 3001
- Next.js automatically proxies `/api/*` requests to the backend

### Manual Deployment

```bash
npm run build
npm run start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC License - See LICENSE file for details

## 👤 Author

**Austin Northrup**
- Location: Ann Arbor, Michigan
- Email: support@protocollm.org
- Phone: (734) 216-4836

## 🙏 Acknowledgments

- Built with [Cohere AI](https://cohere.com) for intelligent document understanding
- Powered by [Supabase](https://supabase.com) for unlimited storage
- Secured with [Cloudflare](https://cloudflare.com) Turnstile
- Vector search with [pgvector](https://github.com/pgvector/pgvector)

---

**ProtocolLM** - Because finding documents shouldn't waste your time.
