# Image-Only Analysis System Implementation

This implementation removes all video processing functionality and restores an image-only analysis pipeline with tiered one-time passcode pricing.

## Overview

**Before**: Video-based system ($149 for up to 60 minutes)  
**After**: Photo-based system with two tiers:
- **BASIC**: $49 for up to 200 photos
- **PREMIUM**: $99 for up to 500 photos

## Key Changes

### 1. Removed Components
- ❌ FFmpeg dependency and video frame extraction
- ❌ Video upload handling and validation
- ❌ Video duration checks and limits
- ❌ Frame deduplication logic
- ❌ All UI references to videos, "60 minutes", "24-hour turnaround"

### 2. New Features
- ✅ Tiered pricing with photo limits
- ✅ Passcode format: `BASIC-XXXXX` or `PREMIUM-XXXXX`
- ✅ Photo count tracking per passcode
- ✅ Passcode locking after report generation
- ✅ Cost logging at $0.01 per image
- ✅ Instant report generation (no processing delay)

### 3. Updated Components
- ✅ Checkout flow with tier selection
- ✅ Access code validation for photo limits
- ✅ Upload UI for photos only (.jpg, .jpeg, .png, .heic)
- ✅ All UI copy and messaging
- ✅ Email notifications with photo limits
- ✅ PDF report generation

## API Endpoints

### New Endpoints

#### POST `/api/access-code/track-upload`
Track photo uploads and enforce limits.

**Request:**
```json
{
  "code": "BASIC-12345",
  "photoCount": 1
}
```

**Response:**
```json
{
  "success": true,
  "totalPhotosUploaded": 125,
  "maxPhotos": 200,
  "remainingPhotos": 75,
  "canUploadMore": true
}
```

**Errors:**
- `403` - Photo limit exceeded
- `403` - Passcode already used
- `404` - Invalid access code

#### POST `/api/access-code/lock`
Lock passcode after report generation.

**Request:**
```json
{
  "code": "BASIC-12345",
  "reportUrl": "https://...",
  "reportData": { /* report metadata */ }
}
```

**Response:**
```json
{
  "success": true,
  "status": "locked",
  "message": "Access code locked. You can still view your report but cannot upload new photos.",
  "reportUrl": "https://..."
}
```

### Updated Endpoints

#### POST `/api/create-checkout-session`
Create Stripe checkout for photo analysis plan.

**Request:**
```json
{
  "email": "user@example.com",
  "tier": "BASIC"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### POST `/api/access-code/validate`
Validate access code and return photo limits.

**Response:**
```json
{
  "valid": true,
  "code": "BASIC-12345",
  "status": "unused",
  "tier": "BASIC",
  "canProcess": true,
  "remainingPhotos": 175,
  "maxPhotos": 200,
  "totalPhotosUploaded": 25
}
```

## User Flow

1. **Purchase** → User selects BASIC or PREMIUM tier
2. **Payment** → Stripe checkout processes payment
3. **Passcode** → System generates `TIER-XXXXX` code and emails user
4. **Upload** → User enters code and uploads photos (multi-session)
5. **Track** → System tracks uploads against limit
6. **Process** → User clicks "Process Report" when ready
7. **Analyze** → Cohere Vision analyzes all photos at $0.01 each
8. **Generate** → PDF report created with Michigan MCL citations
9. **Lock** → Passcode locked permanently (read-only)
10. **Access** → User can still view/download report with locked code

## Error Messages

### Photo Limit Exceeded
```
You've reached your 200 photo limit. Process your report or upgrade to Premium (500 photos).
```

### Invalid File Type
```
Please upload photos only (.jpg, .png, .heic). Videos are not supported.
```

### Passcode Already Used
```
This passcode has been used. Access your report here: [link]
```

### API Failure
```
Error analyzing photos. Please try again or contact support.
```

## Cost Tracking

Every analysis logs costs to the `processing_costs` table:

```sql
{
  session_id: "abc123",
  photo_count: 150,
  api_cost: 1.50,  -- 150 photos × $0.01
  cost_per_photo: 0.01,
  timestamp: "2025-12-28T15:00:00Z"
}
```

## Testing Checklist

- [ ] BASIC plan caps at 200 photos
- [ ] PREMIUM plan caps at 500 photos
- [ ] Multiple upload sessions work before processing
- [ ] No uploads allowed after processing (passcode locked)
- [ ] Report contains Michigan MCL citations
- [ ] Mobile camera capture works
- [ ] Desktop file upload works
- [ ] Batch photo selection works
- [ ] Video files are rejected with proper error
- [ ] Cost logging records $0.01 per image
- [ ] Access codes display as `BASIC-XXXXX` / `PREMIUM-XXXXX`
- [ ] Email shows correct tier and photo limit
- [ ] Pricing page displays both tiers correctly

## Configuration

Ensure these environment variables are set:

```env
# Cohere API
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Email
RESEND_API_KEY=...
FROM_EMAIL=protocolLM <support@protocollm.org>

# App
NEXT_PUBLIC_BASE_URL=https://protocollm.org
```

## Deployment Notes

1. Run database migrations (see `DATABASE_MIGRATION.md`)
2. Remove FFmpeg from production environment
3. Update Stripe product prices to $49 and $99
4. Test passcode generation in webhook
5. Verify email templates render correctly
6. Test file upload with mobile camera
7. Verify cost logging accuracy

## Support

For issues or questions:
- Email: support@protocollm.org
- Documentation: See `DATABASE_MIGRATION.md` for schema changes
