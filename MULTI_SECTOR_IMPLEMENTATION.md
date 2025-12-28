# Multi-Sector Platform Implementation

This document describes the multi-sector restructuring of the compliance automation platform to support Food Safety, Fire & Life Safety, and Rental Housing sectors.

## Overview

The platform has been restructured to support multiple compliance sectors under a single platform while enforcing sector-based access control and billing.

### Supported Sectors

1. **Food Safety** (Active) - $25/month
   - Food service establishments, restaurants, health department inspections
   - Michigan Modified Food Code
   - Fully operational with all documents ingested

2. **Fire & Life Safety - Occupied Buildings** (Coming Soon) - $25/month
   - Fire code compliance, life safety systems
   - Michigan Fire Prevention Code, NFPA standards
   - Document structure prepared, awaiting content

3. **Rental Housing - Residential Habitability** (Coming Soon) - $25/month
   - Property maintenance, tenant safety
   - Michigan Truth in Renting Act, housing codes
   - Document structure prepared, awaiting content

## Access Model

### Subscription Rules
- **$25/month per sector** - Each sector requires a separate subscription
- **One sector per subscription** - Users can only access their subscribed sector
- **No bundled plans** - Regular users cannot access multiple sectors
- **Admin override** - Project owner (admin role) has unrestricted access to all sectors

### Access Enforcement
Sector access is enforced at multiple layers:
- **Document retrieval** - `searchDocuments()` filters by user's sector
- **API responses** - Chat API validates sector access before responding
- **Database queries** - `match_documents()` RPC includes sector filtering
- **Subscription validation** - `checkAccess()` verifies sector entitlement

## Architecture Changes

### 1. File Structure

#### Before (Food Safety only)
```
public/documents/
├── michigan/
│   ├── MI_MODIFIED_FOOD_CODE.pdf
│   ├── Hot_and_Cold_Holding_Guidelines.pdf
│   └── ...
└── washtenaw/
    └── (county-specific docs)
```

#### After (Multi-sector)
```
public/documents/
├── food_safety/          # Food Safety sector (active)
│   ├── MI_MODIFIED_FOOD_CODE.pdf
│   ├── Hot_and_Cold_Holding_Guidelines.pdf
│   ├── README.md
│   └── ...
├── fire_life_safety/     # Fire & Life Safety (coming soon)
│   └── README.md
├── rental_housing/       # Rental Housing (coming soon)
│   └── README.md
└── michigan/            # Legacy folder (backward compatibility)
```

### 2. Code Modules

#### New: `lib/sectors.js`
Central configuration for all sectors including:
- Sector identifiers and metadata
- Price configuration
- Document folder mappings
- Legacy collection → sector mapping
- Access control helpers

#### Updated: `lib/searchDocs.js`
- Added `sectorId` parameter to `searchDocuments()`
- Passes sector filter to database RPC
- Maintains backward compatibility with county-based searches

#### Updated: `lib/usage.js`
- Added `isUserAdmin()` function for admin detection
- Updated `checkAccess()` to accept and validate `sectorId`
- Enforces sector-based access control
- Returns sector information with access check result

#### Updated: `app/api/chat/route.js`
- Imports sector utilities
- Determines sector from request (explicit or derived from county)
- Validates sector access before processing
- Passes sector to document search
- Returns sector-specific error messages

#### Updated: `app/api/admin/ingest/route.js`
- Supports both legacy `collection` and new `sector` parameters
- Maps document folders to sectors during ingestion
- Adds sector metadata to all document chunks
- Supports selective wipe by sector

### 3. Database Schema

Required migrations in `db/migrations/001_add_sector_support.sql`:

#### Subscriptions Table
```sql
ALTER TABLE subscriptions 
ADD COLUMN sector TEXT DEFAULT 'food_safety';
```

#### User Profiles Table
```sql
ALTER TABLE user_profiles 
ADD COLUMN role TEXT DEFAULT 'user';
```

#### Documents RPC Function
```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_threshold float,
  match_count int,
  filter_county text DEFAULT NULL,
  filter_sector text DEFAULT NULL  -- NEW PARAMETER
)
```

## Backward Compatibility

The implementation maintains full backward compatibility with the existing Food Safety system:

### Legacy Support
- **County-based queries** - `searchDocuments(query, 'washtenaw')` still works
- **Collection parameter** - Ingest API accepts `collection: 'michigan'`
- **Database RPC** - `match_documents()` supports both `filter_county` and `filter_sector`
- **Default sector** - All operations default to `food_safety` when sector not specified
- **Existing subscriptions** - Automatically assigned `food_safety` sector

### Migration Path
1. Run database migrations to add sector support
2. Existing subscriptions automatically get `sector = 'food_safety'`
3. Existing documents (no sector metadata) are matched by county field
4. Re-ingest documents to add sector metadata: `POST /api/admin/ingest { sector: 'food_safety', wipe: true }`

## Usage

### Document Ingestion

#### Ingest specific sector (new approach)
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"sector": "food_safety", "wipe": true}'
```

#### Ingest all sectors
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"sector": "all", "wipe": true}'
```

#### Legacy collection-based (still supported)
```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Content-Type: application/json" \
  -d '{"collection": "michigan", "wipe": true}'
```

### Chat API

#### With explicit sector
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the temperature requirements?',
    sector: 'food_safety',  // Explicit sector
  })
})
```

#### Legacy county-based (derives sector)
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the temperature requirements?',
    county: 'washtenaw',  // Maps to food_safety sector
  })
})
```

### Access Control Example

```javascript
import { checkAccess } from '@/lib/usage'
import { SECTORS } from '@/lib/sectors'

// Check access to specific sector
try {
  const access = await checkAccess(userId, SECTORS.FIRE_LIFE_SAFETY)
  if (access.valid) {
    // User has access to Fire & Life Safety sector
    console.log('Admin:', access.isAdmin)
    console.log('Sector:', access.sector)
  }
} catch (error) {
  if (error.code === 'SECTOR_ACCESS_DENIED') {
    // User doesn't have subscription to requested sector
    console.error(`Need subscription to ${error.requestedSector}`)
    console.log(`User has access to ${error.subscribedSector}`)
  }
}
```

## Adding New Sectors

To add a new sector:

1. **Update `lib/sectors.js`**
   - Add sector identifier to `SECTORS` constant
   - Add metadata to `SECTOR_METADATA`
   - Add folder mapping to `SECTOR_DOCUMENT_FOLDERS`

2. **Create document folder**
   ```bash
   mkdir -p public/documents/{new_sector_name}
   ```

3. **Add regulatory documents**
   - Place PDFs in the new folder
   - Create README.md describing the sector

4. **Update database constraint**
   ```sql
   ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_sector_check;
   ALTER TABLE subscriptions ADD CONSTRAINT valid_sector_check 
   CHECK (sector IN ('food_safety', 'fire_life_safety', 'rental_housing', 'new_sector'));
   ```

5. **Ingest documents**
   ```bash
   curl -X POST /api/admin/ingest \
     -d '{"sector": "new_sector", "wipe": true}'
   ```

6. **Update sector metadata active flag**
   ```javascript
   [SECTORS.NEW_SECTOR]: {
     // ...
     active: true,  // Enable the sector
   }
   ```

## Testing

### Verify Sector Isolation
```javascript
// 1. Create two test users with different sector subscriptions
// 2. User A: food_safety subscription
// 3. User B: fire_life_safety subscription (once available)

// 4. Test that User A can only retrieve food_safety documents
const resultsA = await searchDocuments('temperature control', 'michigan', 10, 'food_safety')
// Should return only food safety documents

// 5. Test that User B cannot access food_safety
// API call with sector: 'food_safety' should return 403 SECTOR_ACCESS_DENIED
```

### Verify Admin Access
```javascript
// 1. Set admin role in user_profiles table
UPDATE user_profiles SET role = 'admin' WHERE user_id = '{admin_user_id}';

// 2. Admin should be able to access all sectors regardless of subscription
const access = await checkAccess(adminUserId, 'fire_life_safety')
// Should succeed even without fire_life_safety subscription
// access.isAdmin should be true
```

### Verify Backward Compatibility
```javascript
// Old API calls should still work
const legacyResults = await searchDocuments('temperature', 'washtenaw')
// Should return food_safety documents (default sector)
```

## Security Considerations

1. **Fail-closed** - Access checks throw errors on failure, denying access by default
2. **Multi-layer enforcement** - Sector access validated at API, business logic, and database layers
3. **No cross-sector leakage** - Document searches strictly filtered by user's sector
4. **Admin detection** - Multiple methods (role in DB, email domain) with fallback to non-admin
5. **Audit logging** - All sector access attempts logged with user, sector, and timestamp

## Future Enhancements

- Multi-sector bundles (e.g., all sectors for $60/month)
- Sector-specific UI themes and branding
- Cross-sector compliance reporting for admin users
- Sector-specific violation categories and detection logic
- Geographic expansion (other states beyond Michigan)
