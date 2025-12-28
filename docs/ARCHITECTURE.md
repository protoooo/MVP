# Knowledge Base Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Knowledge Base System                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Visitor   │────▶│   /resources │────▶│  Search API   │
│   (Public)  │     │   Landing    │     │  (Cohere)     │
└─────────────┘     └──────────────┘     └───────────────┘
       │                    │                     │
       │                    │                     ▼
       │                    │            ┌────────────────┐
       │                    │            │   Rate Limit   │
       │                    │            │  (Supabase)    │
       │                    │            └────────────────┘
       │                    │                     │
       │                    ▼                     ▼
       │            ┌──────────────┐     ┌────────────────┐
       │            │  Image API   │────▶│   Analytics    │
       │            │  (Limited)   │     │   Tracking     │
       │            └──────────────┘     └────────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│   Upgrade    │◀───│  Conversion  │
│   to $149    │    │     CTA      │
└──────────────┘    └──────────────┘
```

## Data Flow: Search Query

```
User Types Query
      │
      ▼
┌─────────────────┐
│  Rate Limit     │
│  Check (IP)     │──── 429 if limit exceeded
└─────────────────┘
      │ ✓
      ▼
┌─────────────────┐
│  Sanitize &     │
│  Validate       │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Generate       │
│  Embedding      │──── Cohere Embed API
└─────────────────┘      (~$0.00001)
      │
      ▼
┌─────────────────┐
│  Vector Search  │
│  (Supabase)     │──── Top 10 results
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Rerank Results │──── Cohere Rerank API
│  (Top 5)        │      (~$0.002)
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Find Related   │
│  Requirements   │──── 3 similar regs
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Log to DB      │
│  (Analytics)    │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Return Results │
│  + CTA          │
└─────────────────┘
```

## Data Flow: Image Analysis

```
User Uploads Image + Email
      │
      ▼
┌─────────────────┐
│  Validate Email │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Rate Limit     │
│  Check (Email)  │──── 429 if 3/day limit
└─────────────────┘     + upgrade prompt
      │ ✓
      ▼
┌─────────────────┐
│  Show Modal?    │──── After 2nd image:
│  (remaining=1)  │      "1 analysis left"
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Validate Image │
│  (base64)       │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Vision API     │──── Cohere Vision
│  Analysis       │      (~$0.005)
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Generate       │──── INTENTIONALLY
│  Limited        │      LIMITED OUTPUT
│  Results        │      (drives conversion)
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Log to DB      │
│  (Conversion)   │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Return:        │
│  - X compliant  │
│  - Y issues     │
│  - Categories   │
│  - CTA to $149  │
└─────────────────┘
```

## Database Schema

```
rate_limits
├── id (PK)
├── identifier (IP or email)
├── limit_type ('kb_search' | 'free_image')
├── count
├── window_start
└── updated_at

knowledge_base_queries
├── id (PK)
├── ip_address
├── query
├── results_count
├── duration_ms
└── timestamp

free_image_analyses
├── id (PK)
├── email
├── issues_detected
├── duration_ms
└── timestamp

knowledge_base_conversions
├── id (PK)
├── identifier (IP or email)
├── conversion_type
├── user_id (FK → users)
├── amount
└── timestamp
```

## Conversion Funnel

```
┌──────────────────────┐
│  Organic Search      │  ◀── SEO Landing Pages
│  (Google, Bing)      │      20-30 pages
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Knowledge Base      │  ◀── /resources
│  Landing             │      Free search
└──────────────────────┘
           │
           ├───────────────────────┐
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Search Query    │    │  Static Page     │
│  (tracked)       │    │  (SEO)           │
└──────────────────┘    └──────────────────┘
           │                       │
           └───────┬───────────────┘
                   │
                   ▼
           ┌──────────────┐
           │  Show CTA:   │
           │  "1 of 200+  │
           │  requirements│
           │  checked"    │
           └──────────────┘
                   │
                   ├────────────────┐
                   │                │
                   ▼                ▼
           ┌─────────────┐  ┌──────────────┐
           │ Click CTA   │  │ Try Image    │
           │ → Signup    │  │ Analysis     │
           └─────────────┘  └──────────────┘
                   │                │
                   │                ▼
                   │        ┌──────────────┐
                   │        │ Limited      │
                   │        │ Results      │
                   │        │ (teaser)     │
                   │        └──────────────┘
                   │                │
                   │                ▼
                   │        ┌──────────────┐
                   │        │ After 2nd    │
                   │        │ image: MODAL │
                   │        └──────────────┘
                   │                │
                   └────────┬───────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Signup Page     │
                   │  $149 Video      │
                   │  Analysis        │
                   └──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  Stripe Checkout │
                   └──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  CONVERSION ✓    │
                   │  Track in DB     │
                   └──────────────────┘
```

## Cost Structure

```
┌─────────────────────────────────────────┐
│          Cost per Operation             │
├─────────────────────────────────────────┤
│  Embed Query:      ~$0.00001            │
│  Rerank Results:   ~$0.002              │
│  Vision Analysis:  ~$0.005              │
│  DB Query:         ~$0.0001             │
├─────────────────────────────────────────┤
│  Total Search:     ~$0.002              │
│  Total Image:      ~$0.005              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Daily Limits & Costs            │
├─────────────────────────────────────────┤
│  Max Searches/IP:  240 (10/hr × 24)     │
│  Max Images/Email: 3                    │
│                                         │
│  Per User/Day:                          │
│    240 searches:   $0.48                │
│    3 images:       $0.015               │
│    Total:          ~$0.50               │
│                                         │
│  Alert Threshold:  $5/day               │
│  = ~10 active users/day                 │
└─────────────────────────────────────────┘
```

## Monitoring Dashboard (Conceptual)

```
┌───────────────────────────────────────────────────┐
│              Knowledge Base Analytics              │
├───────────────────────────────────────────────────┤
│                                                    │
│  Today:                                            │
│    Searches:    47        Cost: $0.09             │
│    Images:      12        Cost: $0.06             │
│    Total Cost:  $0.15     Alert: ✓ Under $5      │
│                                                    │
│  Week:                                             │
│    Unique IPs:     156                            │
│    Unique Emails:  43                             │
│    Total Cost:     $1.23                          │
│                                                    │
│  Conversion:                                       │
│    Search → Image:     27.6%  (43/156)           │
│    Image → Purchase:   Track via Stripe          │
│                                                    │
│  Top Queries (create landing pages):              │
│    1. refrigeration temperatures      (23)       │
│    2. handwashing requirements       (19)       │
│    3. chemical storage               (17)       │
│    4. cross contamination            (14)       │
│    5. hot holding temperatures       (12)       │
│                                                    │
└───────────────────────────────────────────────────┘
```

## Security & Rate Limiting

```
┌──────────────────┐
│   Request        │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  Get IP/Email    │
└──────────────────┘
        │
        ▼
┌──────────────────┐         ┌─────────────────┐
│  Check Supabase  │────────▶│  rate_limits    │
│  rate_limits     │         │  table          │
└──────────────────┘         └─────────────────┘
        │
        ├─── Count < Limit ────▶ Allow
        │
        └─── Count >= Limit ───▶ Block
                                     │
                                     ▼
                              ┌─────────────────┐
                              │  Return 429     │
                              │  + Retry-After  │
                              │  + Upgrade Msg  │
                              └─────────────────┘
```

## File Organization

```
/app
  /resources                          # Public knowledge base
    page.js                          # Main search interface
    /refrigeration-temperatures      # Static landing page
    /handwashing-requirements        # Static landing page
    /chemical-storage                # Static landing page
    /[topic]                         # Future landing pages...
  
  /api
    /knowledge-base
      /search                        # Semantic search endpoint
      /analyze-image                 # Free image analysis
    /admin
      /knowledge-base-stats          # Cost & conversion tracking

/lib
  rateLimiting.js                    # Rate limit logic

/supabase
  /migrations
    20241228_knowledge_base_tables.sql

/docs
  KNOWLEDGE_BASE.md                  # Feature docs
  IMPLEMENTATION_SUMMARY.md          # Overview
  TESTING.md                         # Testing guide
  ARCHITECTURE.md                    # This file
```

## API Response Examples

### Search API Success
```json
{
  "query": "refrigeration temperatures",
  "results": [
    {
      "regulation": "Potentially hazardous foods must be...",
      "source": "Michigan Food Code",
      "page": "45",
      "relevance": 0.94,
      "example": "Store raw chicken at 38°F or below..."
    }
  ],
  "relatedRequirements": [...],
  "remaining": 9,
  "resetAt": "2024-12-28T06:00:00Z",
  "conversionMessage": "This is 5 of 200+ requirements..."
}
```

### Rate Limit Error
```json
{
  "error": "You've reached the search limit. Try again in 43 minutes...",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 43
}
```

### Image Analysis Success
```json
{
  "compliantItems": 4,
  "issuesDetected": 2,
  "categories": ["Chemical Handling", "Temperature"],
  "issues": [
    "Possible violation detected: Chemical Handling",
    "Possible violation detected: Temperature"
  ],
  "detailMessage": "Get specific code references...",
  "remaining": 2,
  "showUpgradeModal": false,
  "conversionCta": "Analyze your entire establishment - $149"
}
```
