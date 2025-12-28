# Testing the Knowledge Base Feature

## Quick Start

### 1. Database Setup (One-time)

Run the migration in your Supabase instance:

```bash
# Connect to your Supabase project
# Navigate to SQL Editor in Supabase Dashboard
# Run: supabase/migrations/20241228_knowledge_base_tables.sql
```

Or via CLI:
```bash
supabase db push
```

### 2. Set Environment Variables (Optional)

For admin endpoint access:
```bash
# Add to your .env or Railway/hosting platform
ADMIN_API_KEY=your-secret-admin-key-here
```

### 3. Test the Features

#### Test Search API
```bash
curl -X POST http://localhost:3000/api/knowledge-base/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What are refrigeration temperature requirements?"}'
```

Expected response:
- Top 5 regulation results
- Practical examples
- Related requirements
- Remaining searches (9 after first query)

#### Test Rate Limiting
```bash
# Make 11 requests from same IP
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/knowledge-base/search \
    -H "Content-Type: application/json" \
    -d '{"query": "test query '$i'"}'
  echo "\n---Request $i complete---\n"
done
```

11th request should return 429 error with retry-after message.

#### Test Image Analysis
```bash
# Prepare a test image as base64
IMAGE_DATA=$(base64 -i test-image.jpg | tr -d '\n')

curl -X POST http://localhost:3000/api/knowledge-base/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "image": "data:image/jpeg;base64,'$IMAGE_DATA'"
  }'
```

Expected response:
- Number of compliant items
- Number of issues detected
- High-level issue categories (intentionally vague)
- Remaining analyses (2 after first)

#### Test Admin Stats
```bash
curl -X GET http://localhost:3000/api/admin/knowledge-base-stats \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

Expected response:
- Cost breakdown (today/week/month)
- Search volume
- Image analysis volume
- Top queries
- Conversion funnel metrics

### 4. Test UI

#### Main Knowledge Base Page
```
Visit: http://localhost:3000/resources
```

Test:
- [ ] Search bar accepts input
- [ ] Search returns results
- [ ] Results show regulation text, examples, references
- [ ] Related requirements section appears
- [ ] Rate limit counter displays
- [ ] Conversion CTA shows after results
- [ ] Popular questions are clickable
- [ ] Image upload section expands

#### Image Upload
- [ ] Email validation works
- [ ] File upload accepts images
- [ ] Analysis returns limited results
- [ ] Rate limit counter displays
- [ ] Modal shows after 2nd image
- [ ] Upgrade prompt appears when limit hit

#### Static Landing Pages
```
Visit: http://localhost:3000/resources/refrigeration-temperatures
Visit: http://localhost:3000/resources/handwashing-requirements
Visit: http://localhost:3000/resources/chemical-storage
```

Test:
- [ ] Page loads with SEO metadata
- [ ] Content is comprehensive
- [ ] Search bar works
- [ ] Related links work
- [ ] Conversion CTA is prominent
- [ ] Mobile responsive

## Verify Database Tables

Check that tables were created:

```sql
-- In Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'rate_limits',
  'knowledge_base_queries',
  'free_image_analyses',
  'knowledge_base_conversions'
);
```

Check data is being inserted:

```sql
-- After making a few searches
SELECT count(*) FROM knowledge_base_queries;
SELECT * FROM knowledge_base_queries ORDER BY timestamp DESC LIMIT 5;

-- After uploading images
SELECT count(*) FROM free_image_analyses;
SELECT * FROM free_image_analyses ORDER BY timestamp DESC LIMIT 5;

-- Check rate limits
SELECT * FROM rate_limits ORDER BY window_start DESC;
```

## Monitor Costs

Check estimated costs:

```bash
curl -X GET http://localhost:3000/api/admin/knowledge-base-stats \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  | jq '.costs'
```

Should show:
```json
{
  "today": "0.0234",
  "week": "0.1234",
  "month": "0.4567",
  "dailyLimit": 5.00,
  "alertThreshold": false
}
```

## Common Issues

### Issue: Rate limit not working
**Solution:** Check that Supabase tables exist and service role key is set

### Issue: Search returns no results
**Solution:** Verify Michigan Food Code documents are embedded in Supabase

### Issue: Image analysis fails
**Solution:** Check COHERE_API_KEY is set and vision model is accessible

### Issue: Admin stats return 401
**Solution:** Set ADMIN_API_KEY and include in Authorization header

## Performance Benchmarks

Expected response times (local):
- Search API: 200-500ms
- Image Analysis: 2-5 seconds
- Static pages: <100ms
- Admin stats: 100-200ms

## Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Check database is populating
3. ✅ Monitor costs for 24 hours
4. Create additional landing pages
5. Submit sitemap to Google
6. Set up monitoring/alerting
7. Track conversions via Stripe webhooks

## Questions or Issues?

Check the documentation:
- `/docs/KNOWLEDGE_BASE.md` - Detailed feature documentation
- `/docs/IMPLEMENTATION_SUMMARY.md` - Implementation overview

Or review the code:
- `/lib/rateLimiting.js` - Rate limiting logic
- `/app/api/knowledge-base/search/route.js` - Search API
- `/app/api/knowledge-base/analyze-image/route.js` - Image API
- `/app/resources/page.client.js` - Main UI
