# Knowledge Base Feature

## Overview

Free semantic search knowledge base for Michigan food safety regulations to drive traffic and conversions.

## Features

### 1. Semantic Search Interface
- Clean search bar with natural language queries
- Cohere embeddings for semantic search
- Top 3-5 most relevant regulation sections
- Practical examples for each regulation
- Related requirements section

### 2. Rate Limiting
- **Knowledge base search**: 
  - 5 queries per day per IP address
  - 20 queries per week per IP address
  - Both limits must be satisfied
- **Free image analysis**: 
  - 3 images per day per IP address
  - 10 images per week per IP address
  - Both limits must be satisfied
  - Email address required for tracking
- Uses Supabase to track limits
- Clear error messages with upgrade paths

### 3. Free Image Analysis Teaser
- Single image upload (drag-drop or mobile camera)
- High-level results: X compliant items, Y potential issues
- Intentionally limited detail to drive conversions
- Requires email address
- Modal after 2nd image with upgrade prompt

### 4. Static Landing Pages
- SEO-optimized pages for top questions
- Example: `/resources/refrigeration-temperatures`
- Pre-generated answers with citations
- Search bar for follow-up questions
- Create 20-30 pages for common questions

### 5. Conversion Funnel
- CTA after search results
- Image upload teaser after showing results
- Tracking: search → image upload → video purchase
- Example statistics: "We caught this violation in 34% of analyses"

### 6. Cost Monitoring
- Admin endpoint: `/api/admin/knowledge-base-stats`
- Logs query volume and estimated costs
- Alert if daily costs exceed $5
- Tracks conversion rates

## Setup

### 1. Database Migration

Run the migration to create required tables:

```sql
-- Run: supabase/migrations/20241228_knowledge_base_tables.sql
```

Tables created:
- `rate_limits` - Rate limiting tracking
- `knowledge_base_queries` - Search query analytics
- `free_image_analyses` - Image upload analytics
- `knowledge_base_conversions` - Conversion tracking

### 2. Environment Variables

Required:
- `COHERE_API_KEY` - Already configured
- `COHERE_EMBED_MODEL` - Already configured
- `COHERE_RERANK_MODEL` - Already configured
- `NEXT_PUBLIC_SUPABASE_URL` - Already configured
- `SUPABASE_SERVICE_ROLE_KEY` - Already configured

Optional:
- `ADMIN_API_KEY` - For accessing admin stats endpoint

### 3. Cost Estimates

Per operation (approximate):
- Semantic search: ~$0.002 (embedding + rerank)
- Image analysis: ~$0.005 (vision model)

With rate limits:
- Max daily searches: 240 per IP (10/hour × 24 hours)
- Max daily images: 3 per email
- Estimated max daily cost: < $2 per active user

Daily cost alert threshold: $5

## Usage

### Knowledge Base Page

Navigate to `/resources` to access the knowledge base.

### API Endpoints

#### Search
```bash
POST /api/knowledge-base/search
Content-Type: application/json

{
  "query": "What are refrigeration temperature requirements?"
}
```

Response:
```json
{
  "query": "...",
  "results": [...],
  "relatedRequirements": [...],
  "remaining": 8,
  "resetAt": "2024-12-28T06:00:00Z",
  "conversionMessage": "..."
}
```

#### Image Analysis
```bash
POST /api/knowledge-base/analyze-image
Content-Type: application/json

{
  "email": "user@example.com",
  "image": "data:image/jpeg;base64,..."
}
```

Response:
```json
{
  "compliantItems": 4,
  "issuesDetected": 2,
  "categories": ["Chemical Handling", "Temperature Control"],
  "issues": ["Possible violation detected: ..."],
  "remaining": 2,
  "showUpgradeModal": false
}
```

#### Admin Stats
```bash
GET /api/admin/knowledge-base-stats
Authorization: Bearer YOUR_ADMIN_API_KEY
```

Response:
```json
{
  "costs": {
    "today": "0.1234",
    "week": "0.8901",
    "month": "3.4567",
    "dailyLimit": 5.00,
    "alertThreshold": false
  },
  "searches": {...},
  "images": {...},
  "topQueries": [...],
  "conversionFunnel": {...}
}
```

## SEO Strategy

### Static Landing Pages to Create

1. `/resources/refrigeration-temperatures` ✓ (Created)
2. `/resources/handwashing-requirements`
3. `/resources/chemical-storage`
4. `/resources/cross-contamination-prevention`
5. `/resources/hot-holding-temperatures`
6. `/resources/cooling-procedures`
7. `/resources/food-labeling-requirements`
8. `/resources/equipment-sanitization`
9. `/resources/pest-control-requirements`
10. `/resources/food-storage-guidelines`
11. `/resources/employee-health-policies`
12. `/resources/cleaning-schedules`
13. `/resources/allergen-management`
14. `/resources/date-marking-requirements`
15. `/resources/thawing-procedures`
16. `/resources/cooking-temperatures`
17. `/resources/bare-hand-contact`
18. `/resources/dishwashing-procedures`
19. `/resources/water-supply-requirements`
20. `/resources/facility-maintenance`

Each page should:
- Have unique, SEO-optimized content
- Include practical examples
- Show related requirements
- Include search bar for follow-ups
- Have conversion CTA
- Link back to main knowledge base

## Conversion Optimization

### Tracking Points

1. **Knowledge base visit** → Track unique IPs
2. **Search query** → Log query, results count
3. **Image upload** → Log email, issues detected
4. **Upgrade modal shown** → Track impressions
5. **CTA clicked** → Track clicks to signup page
6. **Purchase completed** → Link via Stripe webhook

### A/B Testing Ideas

- CTA placement and wording
- Number of free image analyses (3 vs 5)
- Timing of upgrade modal (after 2nd vs 3rd image)
- Detail level in limited results
- Conversion message copy

## Maintenance

### Regular Tasks

1. **Monitor costs** - Check admin stats daily
2. **Clean up old data** - Run rate limit cleanup weekly
3. **Update popular questions** - Based on top queries
4. **Create new landing pages** - For trending queries
5. **Update examples** - Keep practical examples current

### Cleanup Script

```javascript
// Run weekly via cron
import { cleanupRateLimits } from '@/lib/rateLimiting'
await cleanupRateLimits()
```

## Monitoring

Key metrics to track:
- Daily search volume
- Daily image analysis volume
- Daily costs
- Conversion rate: search → image upload
- Conversion rate: image upload → purchase
- Top queries (for landing page ideas)
- Rate limit hits (indicates demand)

## Future Enhancements

1. **Caching** - Add Redis for frequently asked questions
2. **Analytics Dashboard** - Visual dashboard for conversion funnel
3. **Email Capture** - Optional email for search results
4. **Query Suggestions** - Autocomplete based on popular queries
5. **More Landing Pages** - Expand to 50+ pages
6. **Video Snippets** - Add video examples to landing pages
7. **PDF Export** - Allow users to download regulation summaries
8. **API Access** - Paid API tier for high-volume users
