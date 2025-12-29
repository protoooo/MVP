# Migration Guide: From Food Safety to Multi-Industry Visual Reasoning API

This guide helps you migrate from the existing Michigan Food Safety API to the new multi-industry Visual Reasoning API.

## Overview

The Visual Reasoning API is a **superset** of the existing Food Safety API. All food safety functionality is preserved and enhanced, while adding support for multiple industries and configurable standards.

## Key Changes

### 1. New Endpoint: `/api/audit-media`

The new primary endpoint is `/api/audit-media` (instead of `/api/audit-photos`).

**Old:**
```javascript
POST /api/audit-photos
```

**New:**
```javascript
POST /api/audit-media
```

The old endpoint **still works** for backward compatibility, but new integrations should use `/api/audit-media`.

### 2. Response Format Changes

The response format is now more structured and industry-agnostic.

**Old Response:**
```json
{
  "violations": ["3-501.16 Cold storage <41°F"],
  "score": 87,
  "michigan_code_refs": ["3-501.16"],
  "analyzed_count": 1,
  "credits_used": 1,
  "remaining_credits": 999
}
```

**New Response:**
```json
{
  "session_id": "uuid",
  "findings": [
    {
      "type": "issue",
      "severity": "major",
      "category": "Temperature Control",
      "description": "Cold storage temperature above 41°F",
      "confidence": 0.92,
      "location": "walk-in cooler",
      "recommendation": "Lower temperature to below 41°F immediately",
      "document_reference": "Michigan Food Code 3-501.16"
    }
  ],
  "severity_summary": {
    "critical": 0,
    "major": 1,
    "minor": 0,
    "info": 2
  },
  "overall_score": 87,
  "compliant": true,
  "summary": "Analyzed 1 image(s). Found 1 issue(s).",
  "media_analyzed": 1,
  "credits_used": 1,
  "remaining_credits": 999,
  "profile_used": {
    "id": "uuid",
    "name": "Food Service - General",
    "industry": "food",
    "task_type": "general"
  }
}
```

### 3. Standards Profiles

The new API introduces **Standards Profiles** that define evaluation criteria.

For **food safety**, system profiles are automatically available:
- Food Service - General
- Food - Receiving
- Food - Storage
- Food - Cleaning

**To use food safety profiles:**

```javascript
// 1. List available profiles
const profilesResponse = await fetch('/api/profiles', {
  headers: { 'X-Api-Key': 'your_api_key' }
})
const { profiles } = await profilesResponse.json()

// 2. Find food safety profile
const foodProfile = profiles.find(p => 
  p.industry === 'food' && p.task_type === 'general'
)

// 3. Use in analysis
const response = await fetch('/api/audit-media', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    images: ['https://example.com/kitchen.jpg'],
    standards_profile_id: foodProfile.id,
    metadata: {
      location: 'kitchen'
    }
  })
})
```

**Or use zero-config mode** (no profile needed):

```javascript
// Just send images - defaults to appropriate profile
const response = await fetch('/api/audit-media', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    images: ['https://example.com/kitchen.jpg'],
    metadata: {
      location: 'kitchen'
    }
  })
})
```

### 4. Webhooks

The new API supports webhook notifications.

**Register a webhook:**
```javascript
const response = await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    webhook_url: 'https://your-server.com/webhook',
    max_retries: 3,
    retry_delay_seconds: 60
  })
})

const { webhook } = await response.json()
console.log('Webhook secret:', webhook.webhook_secret) // Save this!
```

**Your webhook will receive:**
- Same JSON structure as API response
- Signed with HMAC-SHA256
- Automatic retries on failure

### 5. Custom Profiles for Food Safety

You can now create custom food safety profiles with your specific rules.

```javascript
const response = await fetch('/api/profiles', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profile_name: 'My Restaurant - Kitchen Standards',
    industry: 'food',
    task_type: 'general',
    strictness_level: 'high',
    plain_language_rules: [
      'All food must be labeled with date and time',
      'Cold storage must be below 38°F (stricter than 41°F)',
      'No cardboard in walk-in coolers',
      'Hand sink must have soap and paper towels',
      'Floor drains must be clean and odor-free'
    ],
    description: 'Our internal kitchen standards'
  })
})
```

## Migration Steps

### Step 1: Database Migration

Run the new schema to add Standards Profiles and Webhook tables:

```sql
-- Run this in your Supabase SQL Editor
-- File: database/schema-standards-profiles.sql
```

This creates:
- `standards_profiles` table
- `webhook_configs` table
- `webhook_deliveries` table
- Default system profiles for all industries (including food)

### Step 2: Update API Calls (Optional)

**Option A: Keep using old endpoint** (backward compatible)
- `/api/audit-photos` still works
- Returns old format for compatibility
- No code changes needed

**Option B: Migrate to new endpoint** (recommended)
- Update endpoint to `/api/audit-media`
- Update response parsing to use new structure
- Optionally add profile selection

### Step 3: Test Migration

```bash
# Test old endpoint (should still work)
curl -X POST https://your-app.com/api/audit-photos \
  -H "X-Api-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://example.com/test.jpg"]}'

# Test new endpoint
curl -X POST https://your-app.com/api/audit-media \
  -H "X-Api-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://example.com/test.jpg"]}'
```

## Mapping Old to New

### Fields

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `violations` | `findings[].description` | Now structured with more detail |
| `score` | `overall_score` | Same meaning |
| `michigan_code_refs` | `findings[].document_reference` | Per-finding references |
| `analyzed_count` | `media_analyzed` | Same meaning |
| `violation_count` | `severity_summary.*` | Now broken down by severity |
| `credits_used` | `credits_used` | Same |
| `remaining_credits` | `remaining_credits` | Same |

### Processing Findings

**Old way:**
```javascript
const { violations, score } = result
violations.forEach(v => console.log(v))
```

**New way:**
```javascript
const { findings, overall_score, severity_summary } = result

// Filter by type
const issues = findings.filter(f => f.type === 'issue')
const confirmations = findings.filter(f => f.type === 'confirmation')

// Filter by severity
const criticalIssues = findings.filter(f => f.severity === 'critical')
const majorIssues = findings.filter(f => f.severity === 'major')

// Use structured data
findings.forEach(f => {
  console.log(`[${f.severity}] ${f.category}: ${f.description}`)
  if (f.recommendation) {
    console.log(`  → ${f.recommendation}`)
  }
})
```

## Benefits of Migration

### 1. More Detailed Results
- Each finding has category, severity, confidence, location
- Recommendations included
- Both issues AND confirmations (what's done well)

### 2. Better Integration
- Webhook support for async processing
- Batch processing up to 200 images
- Structured metadata

### 3. Customization
- Create custom profiles with your rules
- Adjust strictness levels
- Add your own documentation

### 4. Multi-Industry Ready
- Same API for food, retail, logistics, etc.
- Share infrastructure across departments
- Easy to add new use cases

## Rollback Plan

If you need to rollback:

1. The old `/api/audit-photos` endpoint remains unchanged
2. New tables don't affect old functionality
3. No breaking changes to existing code

## Support

For migration help:
- API Documentation: `VISUAL_REASONING_API.md`
- Examples: `examples/visual-reasoning-api-examples.js`
- Test your migration with example scripts

## Timeline Recommendation

- **Week 1**: Run database migration, test both endpoints
- **Week 2**: Create food safety custom profiles if needed
- **Week 3**: Migrate one integration to new endpoint
- **Week 4**: Migrate remaining integrations
- **Week 5+**: Explore webhook integration, new industries

## Common Issues

### Issue: "Profile not found"
**Solution:** Run database migration to create default profiles

### Issue: "Webhook already exists"
**Solution:** Each API key can have one webhook. Delete old one first or update it.

### Issue: "Response format different"
**Solution:** Update parsing code to use new `findings` structure instead of `violations`

### Issue: "Old Michigan code refs missing"
**Solution:** Check `findings[].document_reference` for code references

## Questions?

Check the full API documentation in `VISUAL_REASONING_API.md` or contact support.
