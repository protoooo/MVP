# Multi-Sector Platform - Quick Start Guide

## Overview
The compliance automation platform now supports multiple sectors with per-sector billing and access control.

## Supported Sectors
1. **Food Safety** ✅ Active - $25/month
2. **Fire & Life Safety** 🚧 Coming Soon - $25/month  
3. **Rental Housing** 🚧 Coming Soon - $25/month

## For Developers

### Setup
```bash
# Install dependencies
npm install

# Run tests
node scripts/test-sectors.js
node scripts/test-backward-compatibility.js

# Start development server
npm run dev
```

### Key Files
- `lib/sectors.js` - Sector configuration
- `lib/searchDocs.js` - Document search with sector filtering
- `lib/usage.js` - Access control with sector validation
- `app/api/chat/route.js` - Chat API with sector support
- `app/api/admin/ingest/route.js` - Document ingestion

### API Examples

**Legacy (backward compatible):**
```javascript
POST /api/chat
{
  "message": "What are temperature requirements?",
  "county": "washtenaw"  // Maps to food_safety
}
```

**New (sector explicit):**
```javascript
POST /api/chat
{
  "message": "What are temperature requirements?",
  "sector": "food_safety"
}
```

**Document Ingestion:**
```javascript
POST /api/admin/ingest
{
  "sector": "food_safety",
  "wipe": true
}
```

## For Administrators

### Initial Setup
1. Run database migrations: `db/migrations/001_add_sector_support.sql`
2. Set admin role: `UPDATE user_profiles SET role = 'admin' WHERE user_id = '...'`
3. Re-ingest documents: `POST /api/admin/ingest {"sector":"food_safety","wipe":true}`

### Adding a New Sector
1. Add documents to `public/documents/{sector_name}/`
2. Update `lib/sectors.js` to set `active: true`
3. Run ingestion: `POST /api/admin/ingest {"sector":"new_sector"}`
4. Update database constraint to include new sector

### Monitoring
Check logs for:
- `Sector access granted` - successful access
- `SECTOR_ACCESS_DENIED` - blocked access (expected)
- `Search completed successfully` - includes sector field

## For Users

### Subscription Model
- $25/month per sector
- Each subscription grants access to ONE sector only
- To access multiple sectors, subscribe to each separately
- Admin users have unrestricted access to all sectors

### Current Status
- Food Safety: Fully operational
- Fire & Life Safety: Coming soon (awaiting regulatory documents)
- Rental Housing: Coming soon (awaiting regulatory documents)

## Documentation

- **Technical Details:** `MULTI_SECTOR_IMPLEMENTATION.md`
- **Deployment:** `DEPLOYMENT_GUIDE.md`
- **Database Schema:** `db/migrations/001_add_sector_support.sql`
- **Testing:** `scripts/test-sectors.js`, `scripts/test-backward-compatibility.js`

## Need Help?

1. Check existing documentation (above)
2. Run test scripts to verify setup
3. Review logs for error details
4. Check database migrations are applied

## Key Principles

✅ **Backward Compatible** - All existing Food Safety functionality preserved
✅ **Sector Isolated** - Users only access their subscribed sector
✅ **Admin Override** - Admins can access all sectors
✅ **Extensible** - Easy to add new sectors
✅ **Secure** - Multi-layer access enforcement
