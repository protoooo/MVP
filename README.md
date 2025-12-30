# MI Health Inspection

A compliance analysis tool for Michigan food service establishments to prepare for health inspections. Provides document-grounded Q&A and visual inspection analysis powered by Cohere.

**Domain:** mihealthinspection.com

## Overview

MI Health Inspection helps Michigan restaurants, cafes, food trucks, and other food service establishments prepare for health inspections by:

1. **Free Compliance Q&A** - Ask questions grounded in Michigan food safety regulations (no hallucination)
2. **Image Analysis ($50)** - Upload or capture photos of kitchen, prep areas, storage for violation analysis
3. **Video Analysis ($200)** - Record or upload walkthrough videos for comprehensive timeline-based analysis

All analysis is grounded in Michigan state-level food safety and health inspection documents.

## Core Principles

- ❌ No user accounts
- ❌ No authentication
- ❌ No subscriptions
- ✅ Pay only when needed
- ✅ Works on mobile + desktop
- ✅ Inspection-focused, document-grounded
- ✅ Outputs downloadable PDF reports

## Technology Stack

- **Frontend**: Next.js 15 (React 19)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with pgvector)
- **AI Models** (Cohere):
  - AYA 32B - Q&A responses
  - Embed 4.0 - Document retrieval
  - Rerank 4.0 - Precision ranking
  - Vision - Image/video analysis
- **Payments**: Stripe (one-time payments)
- **PDF Generation**: PDFKit

## Features

### 1. Free Compliance Q&A

- Text-based questions about Michigan food safety regulations
- Strictly grounded in compliance documents
- Uses RAG (Retrieval Augmented Generation):
  - Cohere Embed 4.0 for document search
  - Cohere Rerank 4.0 for precision
  - Cohere AYA 32B for answer generation
- No hallucination - only answers from documents

### 2. Image Analysis ($50)

- Upload or capture photos via mobile/desktop
- Analyzes images against Michigan food safety codes
- Identifies violations with:
  - Clear violation descriptions
  - Plain-language explanations
  - Severity levels
- Generates downloadable PDF report
- Supported formats: JPG, JPEG, PNG, WEBP, HEIC

### 3. Video Analysis ($200)

- Upload or record video (30-minute processing window)
- Intelligent frame extraction
- Timeline-based violation reporting
- Comprehensive PDF report with timestamps
- Supported formats: MP4, MOV, WEBM, M4V, AVI

## Database Schema

### Tables

1. **analysis_sessions** - Tracks all Q&A, image, and video analysis sessions
2. **payments** - Records Stripe payments for image/video analysis
3. **documents** - Stores Michigan food safety regulation chunks with embeddings

See `database/schema-compliance.sql` for full schema.

## Installation & Setup

### Prerequisites

- Node.js 20.x
- npm 10.x
- Supabase account
- Stripe account
- Cohere API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd MVP
npm install
```

### 2. Database Setup

Run the compliance schema in Supabase SQL Editor:

```bash
# Copy contents of database/schema-compliance.sql
# Paste into Supabase SQL Editor and execute
```

### 3. Environment Variables

Create `.env.local`:

```bash
# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro
COHERE_EMBED_DIMS=1024

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Ingest Michigan Food Safety Documents

```bash
# Place Michigan food safety regulation PDFs in public/documents/
npm run ingest
```

This will:
- Parse PDF documents
- Chunk content
- Generate embeddings with Cohere Embed 4.0
- Store in Supabase `documents` table

### 5. Configure Stripe

1. Create products in Stripe Dashboard:
   - **Image Analysis**: $50 one-time payment
   - **Video Analysis**: $200 one-time payment
2. Set up webhook endpoint: `https://your-domain.com/api/payment/webhook`
3. Add webhook events: `checkout.session.completed`

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 7. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Free Q&A

```
POST /api/qa
Body: { "question": "What temperature must hot food be held at?" }
Response: { "answer": "...", "sources": [...] }
```

### Payment Creation

```
POST /api/payment/create
Body: { "type": "image" | "video" }
Response: { "sessionId": "...", "url": "...", "analysisId": "..." }
```

### Stripe Webhook

```
POST /api/payment/webhook
(Handles checkout.session.completed events)
```

### Image Analysis (Placeholder)

```
POST /api/image/analyze
(Implementation pending)
```

### Video Analysis (Placeholder)

```
POST /api/video/analyze
(Implementation pending)
```

### PDF Generation (Placeholder)

```
POST /api/pdf/generate
(Implementation pending)
```

## Design System

### Colors

- **Primary Accent**: `#4F7DF3` (mid matte blue)
- **Background**: `#FFFFFF` (white)
- **Cards/Panels**: `#F7F8FA` (light gray)
- **Text Primary**: `#0F172A` (dark)
- **Text Secondary**: `#475569` (medium gray)
- **Borders**: `#E5E7EB` (light gray)

### UI Style

- **Inspiration**: Supabase + Adobe (clean, minimal, utility-focused)
- **Theme**: Light only (no dark mode)
- **Buttons**: Chunky, 10-12px border radius
- **Layout**: Single-column, card-based panels
- **Typography**: System fonts, clean hierarchy
- **Effects**: No gradients, no animations (except subtle hover)

## Deployment

### Environment Variables (Production)

Required:
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COHERE_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Railway / Vercel

1. Connect repository
2. Set environment variables
3. Deploy

## Security & Privacy

- **No user accounts** - No PII storage
- **One-time payments** - No recurring billing
- **Stateless** - Each analysis is independent
- **Document-grounded** - No AI hallucination
- **HTTPS** - All traffic encrypted

## Support

For Michigan food service establishments:
- Michigan Department of Agriculture: https://www.michigan.gov/mdard
- Local health departments

For technical support:
- Check Supabase logs
- Review Stripe webhook events
- Cohere API status

## License

Proprietary - MI Health Inspection

## Built With

Next.js, Supabase, Cohere, Stripe

