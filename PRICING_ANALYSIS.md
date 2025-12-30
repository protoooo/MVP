# MI Health Inspection - Pricing & Cost Analysis

## Updated Pricing (Effective: December 30, 2024)

### Image Analysis
- **Price**: $100.00 (one-time payment)
- **Limit**: Up to 1,000 images per session
- **Updated from**: $50.00 (no limit)

### Video Analysis
- **Price**: $300.00 (one-time payment)
- **Limit**: Up to 60 minutes per session
- **Updated from**: $200.00 (30-minute limit)

---

## Cost Structure (Cohere API)

Based on the implementation using Cohere APIs:

### Models Used:
1. **Cohere Aya Vision 32B** (`c4ai-aya-vision-32b`)
   - Used for: Image and video frame analysis
   - Cost: ~$0.01 per image/frame analyzed

2. **Cohere Embed 4.0** (`embed-english-v3.0`)
   - Used for: Document embedding and retrieval
   - Cost: ~$0.0001 per search (negligible)

3. **Cohere Rerank 4.0** (`rerank-english-v3.0`)
   - Used for: Document reranking
   - Cost: ~$0.0001 per reranking operation (negligible)

---

## Margin Analysis

### Image Analysis

**Maximum Usage Scenario** (1,000 images):
- Revenue: $100.00
- Costs:
  - Vision API (1,000 images × $0.01): $10.00
  - Embed/Rerank (document retrieval): ~$0.01
  - Storage (Supabase): ~$0.10
  - PDF Generation: ~$0.01
  - **Total Cost**: ~$10.12
- **Gross Profit**: $89.88
- **Margin**: 89.9%

**Average Usage Scenario** (100 images):
- Revenue: $100.00
- Costs:
  - Vision API (100 images × $0.01): $1.00
  - Embed/Rerank: ~$0.01
  - Storage: ~$0.02
  - PDF Generation: ~$0.01
  - **Total Cost**: ~$1.04
- **Gross Profit**: $98.96
- **Margin**: 99.0%

---

### Video Analysis

**Maximum Usage Scenario** (60 minutes):

Assumptions:
- Video processing at 1 frame per second = 60 frames/minute
- 60 minutes × 60 frames = 3,600 frames analyzed
- Cost per minute: $2.60 (based on user estimate)

**Revenue**: $300.00

**Costs**:
- Vision API (3,600 frames × $0.01): $36.00
- Embed/Rerank (document retrieval): ~$0.01
- Storage (Supabase - video + frames): ~$0.50
- PDF Generation: ~$0.01
- Video Processing (ffmpeg - compute): ~$0.10
- **Total Cost**: ~$36.62

**Alternate calculation** (based on user's $2.60/min estimate):
- Vision API cost: 60 minutes × $2.60/min = $156.00
- Other costs: ~$0.62
- **Total Cost**: ~$156.62

**Gross Profit**: $143.38
**Margin**: 47.8%

**Average Usage Scenario** (30 minutes):
- Revenue: $300.00
- Vision API cost: 30 minutes × $2.60/min = $78.00
- Other costs: ~$0.35
- **Total Cost**: ~$78.35
- **Gross Profit**: $221.65
- **Margin**: 73.9%

---

## Usage Limits & Enforcement

### Backend Validation (Server-side - ENFORCED)

#### Image Analysis (`/api/image/analyze`)
```javascript
// Maximum 1,000 images per session
if (imageFiles.length > 1000) {
  return NextResponse.json(
    { error: 'Maximum 1,000 images allowed per analysis session' },
    { status: 400 }
  )
}
```

#### Video Analysis (`/api/video/analyze`)
```javascript
// Maximum 60 minutes (3,600 seconds)
const maxDurationSeconds = 60 * 60
if (metadata.duration > maxDurationSeconds) {
  const durationMinutes = Math.round(metadata.duration / 60)
  return NextResponse.json(
    { 
      error: `Maximum 60 minutes of video allowed per analysis session. Your video is ${durationMinutes} minutes long.` 
    },
    { status: 400 }
  )
}
```

### Frontend Validation (Client-side - WARNING)

#### Upload Page (`/app/upload/page.js`)
- Image count validation before upload
- Video duration check using HTML5 video element
- Clear error messages displayed to user
- Remaining capacity display for images
- Upload limits displayed prominently

---

## Stripe Product Configuration

**IMPORTANT**: Stripe product prices must be updated manually in the Stripe Dashboard:

### Current Stripe Products (TO BE UPDATED)

1. **Image Analysis Product**
   - Current Price: $50.00
   - **New Price**: $100.00
   - Description: "Image Analysis - Up to 1,000 images"
   - Type: One-time payment
   - Environment Variable: `STRIPE_PRICE_ID_IMAGE`

2. **Video Analysis Product**
   - Current Price: $200.00
   - **New Price**: $300.00
   - Description: "Video Analysis - Up to 60 minutes"
   - Type: One-time payment
   - Environment Variable: `STRIPE_PRICE_ID_VIDEO`

### Update Instructions:

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Products
3. Update "Image Analysis" price to $100.00
4. Update "Video Analysis" price to $300.00
5. Update product descriptions to include usage limits
6. Copy the new Price IDs
7. Update environment variables:
   - `STRIPE_PRICE_ID_IMAGE` (for $100 product)
   - `STRIPE_PRICE_ID_VIDEO` (for $300 product)

---

## Summary

### Key Changes Implemented:

1. ✅ **Backend Validation**
   - Image count limit: 1,000 images (enforced)
   - Video duration limit: 60 minutes (enforced)
   - Clear error messages with 400 status codes

2. ✅ **Frontend Updates**
   - Pricing display updated to $100/$300
   - Usage limits displayed ("up to 1,000 images", "up to 60 minutes")
   - Client-side validation and warnings
   - Remaining capacity display

3. ✅ **Documentation**
   - README.md updated
   - Terms of Service updated
   - All hardcoded price references updated

4. ⚠️ **Stripe Configuration** (Manual Action Required)
   - Update product prices in Stripe Dashboard
   - Update environment variables with new Price IDs

### Profit Margins:

- **Image Analysis**: 89.9% margin at max usage (1,000 images)
- **Video Analysis**: 47.8% margin at max usage (60 minutes)

Both services maintain healthy profit margins while providing value to customers and enforcing reasonable usage limits.
