# Stripe Subscription Implementation Summary

## ✅ Completed Features

### Phase 1: Stripe Subscription Backend ✓
- [x] Installed Stripe SDK (`stripe`) and Resend SDK (`resend`)
- [x] Created Stripe configuration (`backend/src/config/stripe.ts`)
  - Price lookup key: `small_business_monthly_25`
  - Plan: Business Plan at $25/month
  - Trial period: 14 days
- [x] Database schema for subscriptions
  - `subscriptions` table with customer_id, subscription_id, status, trial dates
  - `stripe_webhook_events` table for idempotent webhook handling
  - `password_reset_tokens` table for secure password resets
  - `audit_logs` table for comprehensive logging
  - ToS tracking fields on users table
- [x] Subscription routes (`backend/src/routes/subscription.ts`)
  - GET `/api/subscription/status` - Check subscription status
  - POST `/api/subscription/create-checkout-session` - Create Stripe Checkout
  - POST `/api/subscription/create-portal-session` - Manage subscription
  - POST `/api/subscription/accept-terms` - Accept ToS
- [x] Webhook handler (`backend/src/routes/webhooks.ts`)
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
  - Idempotent event processing
- [x] Subscription middleware (`backend/src/middleware/subscription.ts`)
  - `requireSubscription` - Enforce active subscription
  - `requireTosAcceptance` - Enforce ToS acceptance
  - Both subscription AND ToS required for app access

### Phase 2: Terms of Service ✓
- [x] Updated Terms of Service page (`app/terms/page.tsx`)
  - Legal content requirements clearly stated
  - Zero-tolerance policy for illegal content
  - Law enforcement cooperation clause
  - User responsibility for uploaded data
  - Updated to reflect Business Plan only
  - Security and privacy features documented
- [x] ToS Acceptance Modal (`app/components/TosAcceptanceModal.tsx`)
  - Two-checkbox confirmation system
  - Key points summary
  - Illegal content warnings
  - Link to full terms
  - Professional blue-teal gradient styling

### Phase 3: Password & Email System ✓
- [x] Password reset functionality
  - POST `/api/auth/request-password-reset` route
  - POST `/api/auth/reset-password` route
  - Secure token generation with 1-hour expiration
  - Email service integration
  - Forgot password page (`app/(auth)/forgot-password/page.tsx`)
  - Reset password page (`app/(auth)/reset-password/page.tsx`)
- [x] Email service already configured (`backend/src/services/emailService.ts`)
  - Welcome emails
  - Password reset emails
  - Storage warning emails
  - Support emails
  - Uses Resend with configured domain
- [x] Password complexity validation
  - Minimum 8 characters
  - Uppercase, lowercase, number requirements
  - Visual strength indicator on all password forms

### Phase 4: UI/UX Improvements ✓
- [x] Color theme updated to professional blue-teal gradient
  - Primary brand: Cyan-600 (#0891b2)
  - Secondary: Teal-500 (#14b8a6)
  - Gradient buttons throughout
  - Updated all `emerald-*` references to `brand-*`
- [x] Header fonts reduced for professional appearance
  - H1: 4xl-5xl (from 5xl-6xl)
  - H2: 3xl (from 4xl)
  - Cleaner, more professional typography
- [x] Landing page updated
  - Single Business Plan pricing display
  - No personal/enterprise plans
  - Professional badge: "PROFESSIONAL BUSINESS SOLUTION"
  - Cleaner copy focused on business use
- [x] Consistent branding
  - "Business Plan" (not "Small Business Plan")
  - Modern, professional messaging throughout

## 🔨 Remaining Implementation Tasks

### Frontend Integration

#### 1. Integrate ToS Modal in Signup Flow
**File:** `app/(auth)/signup/page.tsx`
```tsx
// Add state for ToS acceptance
const [showTosModal, setShowTosModal] = useState(false);
const [tosAccepted, setTosAccepted] = useState(false);

// Show modal before/after account creation
// Call `/api/subscription/accept-terms` after acceptance
```

#### 2. Create Subscription/Billing Pages
**Files to create:**
- `app/billing/page.tsx` - View subscription, manage payment, cancel
- `app/checkout/page.tsx` - Stripe Checkout redirect page
- `app/checkout/success/page.tsx` - Post-checkout success page
- `app/checkout/cancel/page.tsx` - Checkout cancellation page

**Features needed:**
- Display current subscription status
- Button to manage billing (Stripe Customer Portal)
- Trial countdown display
- Payment method management
- Cancellation flow

#### 3. Update Home Page with Subscription Check
**File:** `app/home/page.tsx`

Add subscription status check on mount:
```tsx
useEffect(() => {
  const checkSubscription = async () => {
    const response = await fetch('/api/subscription/status');
    const data = await response.json();
    
    if (!data.canAccessApp) {
      // Redirect to billing or show ToS modal
      if (!data.tosAccepted) {
        setShowTosModal(true);
      } else if (!data.hasActiveSubscription) {
        router.push('/billing');
      }
    }
  };
  checkSubscription();
}, []);
```

#### 4. Add Turnstile to File Upload
**File:** `app/components/FileUpload.tsx`

Add Cloudflare Turnstile widget before allowing uploads.

### Backend Enhancements

#### 5. Apply Subscription Middleware to Protected Routes
**File:** `backend/src/server.ts` or individual route files

```tsx
import { requireSubscription } from './middleware/subscription';

// Apply to protected routes
app.use('/api/files', requireSubscription, filesRoutes);
app.use('/api/search', requireSubscription, searchRoutes);
app.use('/api/conversation', requireSubscription, conversationRoutes);
// etc.
```

#### 6. Document Sharing via Email
**Create:** `backend/src/routes/share.ts`
- POST `/api/share/document` - Generate signed URL, send email
- Use `emailService` to send sharing emails
- Create signed URLs with expiration (24-48 hours)
- Audit log all share operations

#### 7. Virus/Malware Scanning
**Update:** `backend/src/middleware/fileValidation.ts`

Integrate a scanning service like ClamAV or use a cloud API:
```typescript
// Add virus scanning before file storage
import { scanFile } from '../services/virusScanner';

const scanResult = await scanFile(file.buffer);
if (!scanResult.clean) {
  throw new Error('File rejected: security threat detected');
}
```

#### 8. Enhanced Audit Logging
**Update:** Create `backend/src/middleware/auditLog.ts`
```typescript
export async function auditLog(action, resourceType, resourceId, details) {
  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [userId, action, resourceType, resourceId, JSON.stringify(details), ip, userAgent]
  );
}
```

Apply to:
- File uploads
- File edits
- File deletions
- File shares
- Search queries (already partially done)

#### 9. Signed URLs for Documents
**Update:** `backend/src/services/fileService.ts`

Generate time-limited signed URLs:
```typescript
import crypto from 'crypto';

export function generateSignedUrl(fileId: number, expiresIn: number = 3600) {
  const expires = Date.now() + (expiresIn * 1000);
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET!)
    .update(`${fileId}:${expires}`)
    .digest('hex');
  
  return `/api/files/download/${fileId}?expires=${expires}&signature=${signature}`;
}
```

#### 10. File Encryption at Rest
**Option A:** Use Supabase encryption features
**Option B:** Implement application-level encryption

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export function encryptFile(buffer: Buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return { encrypted, iv, authTag };
}

export function decryptFile(encrypted: Buffer, iv: Buffer, authTag: Buffer) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
```

## 🔐 Environment Variables to Add

Add these to Railway and local `.env`:

```env
# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Already configured
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=ProtocolLM <noreply@protocollm.org>
CLOUDFLARE_TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=...

# Optional for enhanced features
ENCRYPTION_KEY=your_32_character_encryption_key
VIRUS_SCAN_API_KEY=... # If using cloud scanning
```

## 📊 Testing Checklist

### Stripe Integration
- [ ] Create test account with trial
- [ ] Trial countdown displays correctly
- [ ] Checkout flow completes successfully
- [ ] Webhook events are received and processed
- [ ] Subscription status updates in database
- [ ] Access is blocked when subscription inactive
- [ ] Customer portal opens correctly
- [ ] Cancellation works and blocks access

### Terms of Service
- [ ] ToS modal appears for new users
- [ ] Cannot proceed without accepting
- [ ] ToS acceptance is stored in database
- [ ] Access blocked until ToS accepted
- [ ] Terms page displays correctly

### Password Reset
- [ ] Forgot password link works
- [ ] Reset email is sent
- [ ] Reset link expires after 1 hour
- [ ] Password complexity is enforced
- [ ] Token can only be used once
- [ ] Login works with new password

### Security
- [ ] Cloudflare Turnstile on signup ✓
- [ ] Cloudflare Turnstile on login ✓
- [ ] Cloudflare Turnstile on file upload
- [ ] Rate limiting active
- [ ] Audit logs created for all operations
- [ ] Signed URLs expire correctly
- [ ] Virus scanning blocks malicious files

## 💰 Cost Estimation Per User

### Cohere AI API Costs
- **Embed v4**: ~$0.01 per 1,000 documents (one-time)
- **Rerank v4.0 Pro**: ~$0.002 per search
- **Command-R7b**: ~$0.15 per 1M tokens (metadata generation)

**Monthly estimate (average user):**
- 50 uploads/month × $0.00001 = $0.0005
- 100 searches/month × $0.002 = $0.20
- Metadata generation = $0.05
**Total AI: ~$0.25/user/month**

### Infrastructure Costs
- **Railway PostgreSQL**: $5/month base, shared across users
- **Supabase Storage**: $0.021/GB/month
  - Offering "huge storage" (e.g., 1TB/user) = $21/user/month
  - More practical: 100GB/user = $2.10/user/month
  - With compression: 50GB/user = $1.05/user/month

**Total per user (100GB offering):**
- AI: $0.25
- Storage: $2.10
- Stripe fees: $0.75 (3% of $25)
- **Total cost: ~$3.10/user/month**
- **Profit: $21.90/user/month (87.6% margin)**

### Recommended Storage Offering
For $25/month to be competitive with "huge storage":
- **500GB per user** = $10.50 storage + $0.25 AI + $0.75 Stripe = **$11.50 cost**
- **Profit: $13.50/user/month (54% margin)**
- Still excellent margins while offering 500GB (far more than Google Drive's $10/month for 2TB shared)

## 🚀 Next Steps Priority

1. **Critical** - Frontend subscription integration
   - Checkout flow
   - Billing page
   - ToS modal integration
   
2. **Important** - Apply subscription middleware to routes

3. **Nice to have** - Enhanced security features
   - Virus scanning
   - Signed URLs
   - File encryption

4. **Future** - Advanced features
   - Document editing
   - Team collaboration
   - Advanced analytics

## 📝 Notes

- Database migrations run automatically on server startup
- All Stripe webhooks require `STRIPE_WEBHOOK_SECRET` for signature verification in production
- Resend email service is configured and ready to use
- Color theme is fully updated throughout the application
- Password complexity is enforced on all password forms
