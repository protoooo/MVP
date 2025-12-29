# Testing Guide for Native Integrations & Auth Features

## Pre-requisites

### 1. Database Setup
Run the migration in Supabase SQL Editor:
```sql
-- See supabase/migrations/20250101_add_integrations.sql
```

### 2. Environment Variables
Add these to Railway/environment:
```env
# Jolt OAuth
JOLT_CLIENT_ID=your_jolt_client_id
JOLT_CLIENT_SECRET=your_jolt_client_secret

# Lightspeed Webhook
LIGHTSPEED_WEBHOOK_SECRET=your_webhook_secret

# Stripe (Pro Tier)
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx  # $99/mo tier
STRIPE_SECRET_KEY=sk_xxxxx
```

## Test Scenarios

### 1. Authentication Tests

#### Test 1.1: Password Login
1. Navigate to `/login`
2. Enter valid email and password
3. Click "Sign In"
4. **Expected**: Redirected to `/dashboard`

#### Test 1.2: Magic Link Login
1. Navigate to `/login`
2. Click "Use magic link instead"
3. Enter email
4. Click "Send Magic Link"
5. **Expected**: "Check your email" message
6. Check email and click link
7. **Expected**: Redirected to `/dashboard`

#### Test 1.3: Signup
1. Navigate to `/signup`
2. Enter email and password
3. Complete signup
4. **Expected**: Account created, verification email sent

### 2. Subscription Tier Tests

#### Test 2.1: Basic Tier User
1. Login as Basic tier user
2. Navigate to `/dashboard`
3. **Expected**: 
   - Shows "Basic ($49/mo)" plan
   - "Upgrade to Pro" button visible
   - API Keys section shows upgrade prompt
   - No integrations section visible

#### Test 2.2: Pro Tier User
1. Login as Pro tier user
2. Navigate to `/dashboard`
3. **Expected**:
   - Shows "Pro ($99/mo)" plan
   - API Keys "+ New Key" button available
   - Native Integrations section visible
   - Jolt and Lightspeed integration options shown

#### Test 2.3: Upgrade to Pro
1. Login as Basic tier user
2. Click "Upgrade to Pro ($99/mo)" button
3. **Expected**: Redirected to Stripe checkout
4. Complete checkout
5. **Expected**: Redirected back to dashboard with Pro access

### 3. API Key Tests

#### Test 3.1: Generate API Key (Pro User)
1. Login as Pro tier user
2. Go to Dashboard → API Keys
3. Click "+ New Key"
4. Enter key name
5. Click "Generate Key"
6. **Expected**: 
   - Key displayed once (plm_xxxxx format)
   - "Save this key" warning shown
   - Key appears in list with masked value

#### Test 3.2: Generate API Key (Basic User)
1. Login as Basic tier user
2. Try to generate API key
3. **Expected**: Error message "Pro subscription required"

#### Test 3.3: Revoke API Key
1. As Pro user, click "Revoke" on an API key
2. Confirm revocation
3. **Expected**: Key removed from list and deactivated

### 4. Jolt Integration Tests

#### Test 4.1: Connect Jolt (Pro User)
1. Login as Pro tier user
2. Go to Dashboard → Native Integrations
3. Click "Connect" under Jolt
4. **Expected**: 
   - Redirected to Jolt OAuth page
   - After authorization, redirected back to dashboard
   - Jolt shows "✓ Connected" status

#### Test 4.2: Connect Jolt (Basic User)
1. Login as Basic tier user
2. Try to access `/api/connect/jolt`
3. **Expected**: Error "Pro subscription required"

#### Test 4.3: Sync Jolt Photos
1. As Pro user with connected Jolt
2. Click "Sync Now" button
3. **Expected**:
   - Fetches delivery photos from Jolt
   - Analyzes photos for violations
   - Shows success message with counts
   - Updates "Last sync" timestamp

#### Test 4.4: Disconnect Jolt
1. Click "Disconnect" under Jolt
2. Confirm disconnection
3. **Expected**: Status changes to "Not connected"

### 5. Lightspeed Webhook Tests

#### Test 5.1: Lightspeed Webhook (Pro User)
Send POST request to `/api/webhook/lightspeed`:
```bash
curl -X POST https://yourdomain.railway.app/api/webhook/lightspeed \
  -H "Content-Type: application/json" \
  -H "X-Lightspeed-Signature: <hmac_signature>" \
  -d '{
    "user_id": "user-uuid-here",
    "images": [
      "https://example.com/cooler1.jpg",
      "https://example.com/cooler2.jpg"
    ],
    "location": "walk-in-cooler"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "session_id": "uuid",
  "violations": [...],
  "score": 92,
  "report_url": "https://...",
  "analyzed_count": 2,
  "violation_count": 1
}
```

#### Test 5.2: Lightspeed Webhook (Basic User)
Same as above but with Basic tier user_id
**Expected**: 403 error "Pro subscription required"

### 6. API Endpoints Tests

#### Test 6.1: POST /api/audit-photos (with API key)
```bash
curl -X POST https://yourdomain.railway.app/api/audit-photos \
  -H "X-API-Key: plm_xxxxx" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "location=kitchen"
```

**Expected**: Analysis results with violations and report URL

#### Test 6.2: GET /api/reports (with API key)
```bash
curl https://yourdomain.railway.app/api/reports \
  -H "X-API-Key: plm_xxxxx"
```

**Expected**: List of past audit reports

#### Test 6.3: GET /api/keys (authenticated)
```bash
curl https://yourdomain.railway.app/api/keys \
  -H "Authorization: Bearer <session_token>"
```

**Expected**: List of user's API keys (masked)

### 7. Security Tests

#### Test 7.1: CSRF Protection
Try accessing protected endpoints without valid CSRF token
**Expected**: 403 Forbidden

#### Test 7.2: Unauthorized Access
Try accessing `/api/keys` without authentication
**Expected**: 401 Unauthorized

#### Test 7.3: Tier Gate Enforcement
Try accessing Pro-only features as Basic user
**Expected**: 403 Forbidden with upgrade message

#### Test 7.4: Token Security
- Verify OAuth tokens are stored encrypted in database
- Verify refresh tokens are used to renew access tokens
- Verify API keys use secure format (plm_xxxxx with 32 bytes)

### 8. Edge Cases

#### Test 8.1: Expired Jolt Token
1. Connect Jolt integration
2. Manually expire token in database
3. Try to sync
4. **Expected**: Auto-refresh token and sync succeeds

#### Test 8.2: Invalid Webhook Signature
Send Lightspeed webhook with invalid signature
**Expected**: 401 Unauthorized

#### Test 8.3: Rate Limiting
Send 101 requests within 1 hour to webhook
**Expected**: 429 Too Many Requests after 100

## Success Criteria

✅ All authentication flows work (password + magic link)
✅ Tier gating properly restricts Pro features
✅ API keys can be generated and used by Pro users
✅ Jolt OAuth flow connects and syncs photos
✅ Lightspeed webhook receives and processes photos
✅ Dashboard shows correct information per tier
✅ Upgrade flow redirects to Stripe correctly
✅ Security measures prevent unauthorized access
✅ Error messages are clear and helpful
✅ Database migrations apply without errors

## Rollback Plan

If issues are found:
1. Review error logs in Railway
2. Check Supabase logs for database errors
3. Verify environment variables are set
4. Can roll back by removing:
   - `/login` page
   - Integration endpoints
   - Database tier column (keep integrations table for future)
