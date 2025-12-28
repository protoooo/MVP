# Multi-Sector Platform - Deployment Guide

This guide provides step-by-step instructions for deploying the multi-sector restructuring to production.

## Prerequisites

- Access to Supabase SQL Editor
- Admin access to the application
- Backup of current production database
- Verified backup of document storage

## Pre-Deployment Checklist

### 1. Backup Everything
```bash
# Backup database (via Supabase dashboard or CLI)
# Download backup of public/documents folder
# Take snapshot of current environment variables
```

### 2. Verify Current State
```bash
# Run existing tests to ensure baseline works
npm run lint
npm run build

# Test current Food Safety functionality
# Document any existing known issues
```

### 3. Review Changes
```bash
# Review all modified files
git diff origin/main...origin/copilot/add-access-model-for-sectors

# Key files to review:
# - lib/sectors.js (new)
# - lib/searchDocs.js (modified)
# - lib/usage.js (modified)
# - app/api/chat/route.js (modified)
# - app/api/admin/ingest/route.js (modified)
```

## Deployment Steps

### Step 1: Database Migrations (CRITICAL)

Run the SQL migrations in your Supabase SQL Editor:

```bash
# Location: db/migrations/001_add_sector_support.sql
```

**Important:** Execute each section carefully and verify success:

1. Add `sector` column to `subscriptions` table
2. Add `role` column to `user_profiles` table
3. Update `match_documents()` function with sector filtering
4. Create indexes on metadata fields
5. Update existing subscriptions with default sector
6. Add validation constraints

**Verification Queries:**

```sql
-- Verify sector column exists
SELECT sector, COUNT(*) FROM subscriptions GROUP BY sector;

-- Should show all subscriptions have sector = 'food_safety'

-- Verify match_documents accepts new parameters
SELECT * FROM match_documents(
  query_embedding := (SELECT embedding FROM documents LIMIT 1),
  match_threshold := 0.5,
  match_count := 5,
  filter_county := NULL,
  filter_sector := 'food_safety'
);

-- Should return results without error
```

### Step 2: Deploy Code Changes

```bash
# Merge PR or deploy branch
git checkout main
git merge copilot/add-access-model-for-sectors
git push origin main

# Or via your CI/CD pipeline
# Railway/Vercel will auto-deploy on push to main
```

### Step 3: Document Migration

The documents have been reorganized:
- Old: `public/documents/michigan/*.pdf`
- New: `public/documents/food_safety/*.pdf`

**No action needed** - files were moved in the Git commit and will deploy automatically.

### Step 4: Re-Ingest Documents with Sector Metadata

**IMPORTANT:** Existing documents in the database don't have sector metadata. Re-ingest to add it.

```bash
# Option 1: Via API (recommended)
curl -X POST https://your-domain.com/api/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "food_safety",
    "wipe": true
  }'

# Option 2: Via admin UI (if available)
# Navigate to admin panel → Ingest Documents → Select "Food Safety" → Wipe & Ingest

# Expected output:
# {
#   "ok": true,
#   "message": "Ingested X files, Y chunks",
#   "stats": { ... }
# }
```

**Verification:**
```sql
-- Check documents have sector metadata
SELECT 
  metadata->>'sector' as sector,
  COUNT(*) as count
FROM documents 
GROUP BY metadata->>'sector';

-- Should show: food_safety | <count>
```

### Step 5: Set Admin Role (Optional)

Designate admin users who should have access to all sectors:

```sql
-- Method 1: Direct role assignment
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = '<your-admin-user-id>';

-- Method 2: Environment variable (set in hosting platform)
-- ADMIN_EMAIL_DOMAIN=@yourdomain.com
-- Anyone with email ending in this domain becomes admin
```

### Step 6: Verify Deployment

Run comprehensive verification:

#### Test 1: Sector Module
```bash
node scripts/test-sectors.js
# Should output: 🎉 All tests passed!
```

#### Test 2: Backward Compatibility
```bash
node scripts/test-backward-compatibility.js  
# Should output: 🎉 Backward Compatibility: PASSED
```

#### Test 3: Existing Food Safety API
```bash
# Test legacy county-based chat request
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "What are safe cooking temperatures?",
    "county": "washtenaw"
  }'

# Should return food safety compliance response
```

#### Test 4: New Sector-Based API
```bash
# Test explicit sector request
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json"  \
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "What are safe cooking temperatures?",
    "sector": "food_safety"
  }'

# Should return food safety compliance response
```

#### Test 5: Sector Access Control
```bash
# Test unauthorized sector access (should fail)
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json"
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "What are fire code requirements?",
    "sector": "fire_life_safety"
  }'

# Expected response:
# {
#   "error": "Access denied. This feature requires a subscription to the fire_life_safety sector.",
#   "code": "SECTOR_ACCESS_DENIED",
#   "requestedSector": "fire_life_safety",
#   "subscribedSector": "food_safety"
# }
```

#### Test 6: Admin Access
```bash
# Test admin can access all sectors (even without subscription)
# Login as admin user, then:
curl -X POST https://your-domain.com/api/chat \
  -H "Cookie: admin-session-cookie" \
  -d '{
    "sector": "food_safety",
    "message": "Test query"
  }'

# Should succeed and log admin access in console:
# "Sector access granted { isAdmin: true, requestedSector: 'food_safety' }"
```

### Step 7: Monitor Logs

Watch application logs for any errors:

```bash
# Check for these log messages (success indicators):
# ✅ "Sector access granted"
# ✅ "Search completed successfully (Cohere)" with sector field
# ✅ "Document search initiated (Cohere)" with sector field

# Watch for errors:
# ❌ "SECTOR_ACCESS_DENIED" (expected for unauthorized access)
# ❌ "Embedding dimension mismatch" (re-ingest needed)
# ❌ "Supabase search error" (check database function)
```

## Post-Deployment

### Update Documentation
- [ ] Update user documentation with sector information
- [ ] Update API documentation with new sector parameter
- [ ] Document subscription model for sales/support teams

### Monitor Performance
- [ ] Check query performance with sector filtering
- [ ] Monitor database load and query times
- [ ] Verify caching works with sector-scoped keys

### Plan Next Sectors
- [ ] Obtain regulatory documents for Fire & Life Safety
- [ ] Obtain regulatory documents for Rental Housing
- [ ] Test document ingestion for new sectors
- [ ] Develop sector-specific prompt templates

## Rollback Plan

If critical issues arise:

### Quick Rollback (Code Only)
```bash
# Revert to previous deployment
git revert <commit-hash>
git push origin main
# CI/CD will auto-deploy previous version
```

### Full Rollback (Code + Database)
```bash
# 1. Revert code (as above)

# 2. Drop new database constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_sector_check;

# 3. Remove new columns (CAUTION: data loss)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS sector;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

# 4. Restore old match_documents function
-- Run your backup SQL or previous version
```

**Note:** Full rollback should be last resort. Most issues can be fixed forward.

## Troubleshooting

### Issue: "No documents found" after ingestion
**Solution:** Check sector metadata was added during ingest
```sql
SELECT metadata FROM documents LIMIT 1;
-- Should include "sector": "food_safety"
```

### Issue: "SECTOR_ACCESS_DENIED" for existing users
**Solution:** Verify all subscriptions have sector field
```sql
UPDATE subscriptions SET sector = 'food_safety' WHERE sector IS NULL;
```

### Issue: "match_documents does not exist"
**Solution:** Re-run database migration step 3
```sql
-- Check function exists:
\df match_documents
-- If not, run migration script section 3
```

### Issue: Admin cannot access all sectors
**Solution:** Verify admin detection
```sql
-- Check role:
SELECT user_id, role FROM user_profiles WHERE user_id = '<admin-id>';

-- Or check email domain env var:
-- ADMIN_EMAIL_DOMAIN=@yourdomain.com
```

## Success Criteria

Deployment is successful when:
- ✅ All existing Food Safety functionality works unchanged
- ✅ Users can query with legacy county parameters
- ✅ Users can query with new sector parameter
- ✅ Sector access control blocks unauthorized access
- ✅ Admin users can access all sectors
- ✅ Document search returns sector-filtered results
- ✅ No increase in error rates or response times
- ✅ All tests pass: `test-sectors.js` and `test-backward-compatibility.js`

## Support Contacts

If issues arise:
- Technical lead: [Contact info]
- Database admin: [Contact info]
- DevOps: [Contact info]

## Related Documentation

- `MULTI_SECTOR_IMPLEMENTATION.md` - Technical details
- `db/migrations/001_add_sector_support.sql` - Database changes
- `lib/sectors.js` - Sector configuration reference
