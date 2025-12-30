# Quick Reference Guide

## Stripe Price ID Names

Create these products in your Stripe Dashboard:

```
Product 1: Image Compliance Analysis
Price ID: price_image_analysis_50usd
Amount: $50.00 USD

Product 2: Video Compliance Analysis  
Price ID: price_video_analysis_200usd
Amount: $200.00 USD
```

### How to Create in Stripe Dashboard

1. Go to Products in Stripe Dashboard
2. Click "Add Product"
3. For Image Analysis:
   - Name: "Image Compliance Analysis"
   - Description: "MI Health Inspection - Image Analysis (up to 10 images)"
   - Pricing: One-time, $50 USD
   - After creating, copy the Price ID (starts with `price_`)
4. For Video Analysis:
   - Name: "Video Compliance Analysis"
   - Description: "MI Health Inspection - Video Analysis (30 min processing window)"
   - Pricing: One-time, $200 USD
   - After creating, copy the Price ID

## Environment Variables Quick Setup

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Required - Get from Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Required - Get from Cohere Dashboard
COHERE_API_KEY=xxx...

# Required - Get from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Optional - Only if using Price IDs
STRIPE_PRICE_ID_IMAGE=price_image_analysis_50usd
STRIPE_PRICE_ID_VIDEO=price_video_analysis_200usd
```

## Database Setup (Quick Steps)

### Option 1: Run Full Schema (If No Errors)
In Supabase SQL Editor, paste and run:
1. `database/schema-compliance.sql`
2. `database/schema-optimized.sql`

### Option 2: Run in Chunks (If Getting MB Errors)
Follow step-by-step instructions in:
`database/SETUP_GUIDE_OPTIMIZED.md`

### Create Storage Buckets
In Supabase Dashboard → Storage:
1. Create bucket: `analysis-uploads` (public, 500MB limit)
2. Create bucket: `analysis-reports` (public, 50MB limit)

## Document Ingestion

```bash
# 1. Place Michigan food safety PDF files in:
#    public/documents/

# 2. Run ingestion script:
npm run ingest

# This will:
# - Parse PDFs
# - Create chunks
# - Generate embeddings with Cohere
# - Store in Supabase
```

## Test the Endpoints

### Test Q&A (Free, Document-Grounded)
```bash
curl -X POST http://localhost:3000/api/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What temperature must hot food be held at?"}'
```

### Test Image Analysis (Document-Grounded)
```bash
curl -X POST http://localhost:3000/api/image/analyze \
  -F "image0=@path/to/image.jpg" \
  -F "restaurantName=Test Restaurant"
```

### Test Video Analysis (Document-Grounded)
```bash
curl -X POST http://localhost:3000/api/video/analyze \
  -F "video=@path/to/video.mp4" \
  -F "restaurantName=Test Restaurant" \
  -F "framesPerSecond=1"
```

## How Document Grounding Works

All three analysis types now use your ingested Michigan food safety documents:

1. **Q&A:** 
   - User asks question
   - Cohere Embed creates embedding
   - Searches Supabase vector DB
   - Cohere Rerank ranks results
   - Cohere generates answer from documents

2. **Image Analysis:**
   - Before analyzing image, retrieves relevant regulations
   - Passes regulations to Cohere Vision as context
   - Vision analysis cites specific sections from your documents
   - Returns violations grounded in your ingested documents

3. **Video Analysis:**
   - Same as image analysis, but for each extracted frame
   - Timeline shows violations with document citations

## Avoiding Database Errors

### ❌ OLD WAY (causes MB errors):
```javascript
// Storing large arrays in JSONB
await supabase.from('analysis_sessions').update({
  output_summary: { violations: [1000+ violations] } // TOO BIG!
})
```

### ✅ NEW WAY (optimized):
```javascript
// 1. Store violations in separate table
await supabase.from('violations').insert(violations.map(v => ({
  session_id: sessionId,
  description: v.description,
  severity: v.severity,
  citation: v.citation
})))

// 2. Counts auto-update via database trigger
// 3. Query violations separately when needed
const violations = await supabase
  .rpc('get_session_violations', { p_session_id: sessionId })
```

## File Structure

```
lib/
├── storage.js              # Supabase uploads
├── cohereVision.js         # Vision API (document-grounded)
├── documentRetrieval.js    # Retrieve regulations from DB
├── videoProcessor.js       # FFmpeg frame extraction
├── pdfGenerator.js         # PDF reports with branding
├── violationAnalyzer.js    # Violation utilities
└── databaseStorage.js      # Optimized DB operations

app/api/
├── qa/route.js             # FREE Q&A (document-grounded)
├── image/analyze/route.js  # $50 Image analysis (document-grounded)
├── video/analyze/route.js  # $200 Video analysis (document-grounded)
└── pdf/generate/route.js   # PDF generation

database/
├── schema-compliance.sql           # Base schema
├── schema-optimized.sql            # Violations table (prevents MB errors)
└── SETUP_GUIDE_OPTIMIZED.md        # Step-by-step setup
```

## Common Issues & Solutions

### "FFmpeg not found"
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

### "Cohere API error: Unauthorized"
- Check `COHERE_API_KEY` in `.env.local`
- Verify key is active in Cohere dashboard

### "Supabase bucket not found"
- Create buckets in Supabase Dashboard → Storage
- Make them public
- Set file size limits

### "SQL script too large"
- Don't paste entire schema at once
- Use chunked approach in SETUP_GUIDE_OPTIMIZED.md

### "No documents found for grounding"
- Run document ingestion: `npm run ingest`
- Check documents exist: `SELECT COUNT(*) FROM documents;`
- Verify embeddings: `SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL;`

## Production Deployment

1. ✅ Environment variables set
2. ✅ Database schema deployed
3. ✅ Storage buckets created
4. ✅ Documents ingested
5. ✅ FFmpeg available in production
6. ✅ Stripe webhook configured

## Support Documentation

- **IMPLEMENTATION_GUIDE.md** - Detailed implementation
- **DEPENDENCIES.md** - All dependencies explained
- **COMPLETE_SUMMARY.md** - Full implementation summary
- **database/SETUP_GUIDE_OPTIMIZED.md** - Database setup

## Quick Verification

```bash
# Check build
npm run build

# Check lint
npm run lint

# Check FFmpeg
ffmpeg -version

# Check dependencies
npm list cohere-ai @supabase/supabase-js pdfkit

# Check database (in Supabase SQL Editor)
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
SELECT COUNT(*) FROM documents;  -- Should have documents
```

## Summary

✅ All three analysis types use ingested documents
✅ No SQL MB errors (separate violations table)
✅ Stripe Price IDs: `price_image_analysis_50usd` and `price_video_analysis_200usd`
✅ Production-ready code with full error handling
✅ Complete documentation included
