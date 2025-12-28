# Billing Architecture Guide

## Overview

This document describes the billing architecture for the multi-sector compliance system, supporting three distinct pricing models:

1. **Restaurant/Food Service**: Flat $50/month
2. **Rental Housing**: Flat $10/month or $100/year  
3. **Buildings/Fire Safety**: Usage-based ($0.50/minute of video)

---

## 1. Architecture Principles

### 1.1 Core Requirements

✅ **Sector-Based Pricing**: Different billing models per sector  
✅ **Usage Metering**: Track video duration internally for all sectors  
✅ **Flat Rate Simplicity**: Restaurant and rental users see "unlimited" - no usage details  
✅ **Usage-Based Transparency**: Building users see clear per-minute pricing  
✅ **Soft Limits Only**: No hard caps, just internal monitoring for abuse detection  
✅ **Advisory System**: All results are advisory, no compliance decisions  

### 1.2 Technical Stack

- **Payment Processing**: Stripe
- **Database**: Supabase (PostgreSQL)
- **Usage Tracking**: Custom metering via `lib/videoUsageTracking.js`
- **Sector Management**: `lib/sectors.js`
- **Access Control**: `lib/usage.js` (checkAccess)

---

## 2. Sector Configuration

### 2.1 Pricing Model Definition

**File**: `lib/sectors.js`

```javascript
export const SECTOR_METADATA = {
  food_safety: {
    pricingModel: 'flat',
    price: 50, // USD per month
    usageNotes: 'Unlimited weekly inspections included.'
  },
  rental_housing: {
    pricingModel: 'flat',
    price: 10, // USD per month
    priceAnnual: 100, // USD per year
    usageNotes: 'Low-cost access for tenants.'
  },
  fire_life_safety: {
    pricingModel: 'usage',
    usageRates: {
      perMinuteVideo: 0.50, // USD per minute
    },
    usageNotes: 'Billed by video duration.'
  }
}
```

### 2.2 Pricing Calculation

**Helper Functions** (in `lib/sectors.js`):

- `calculateUsageCost(sectorId, usage)` - Calculate cost based on sector
- `getPricingDisplay(sectorId)` - Get user-friendly pricing string

---

## 3. Usage Metering

### 3.1 Video Duration Tracking

**File**: `lib/videoUsageTracking.js`

**Process**:
1. Video is uploaded and stored
2. During processing, `getVideoDuration(videoPath)` extracts duration using ffprobe
3. `logVideoUsage()` records:
   - User ID
   - Session ID
   - Sector
   - Video duration (seconds)
   - Frames analyzed
   - Calculated cost

**Code Example**:
```javascript
const videoDuration = await getVideoDuration(videoPath)
await logVideoUsage({
  userId,
  sessionId,
  sector: 'fire_life_safety',
  videoDurationSeconds: videoDuration,
  framesAnalyzed: uniqueFrames.length
})
```

### 3.2 Storage

**Tables**:

1. **`usage_events`** (existing - enhanced)
   - Tracks all usage events across sectors
   - Columns: `video_duration_seconds`, `frames_analyzed`, `sector`
   - Used for analytics and internal monitoring

2. **`building_video_usage`** (new - for usage-based billing)
   - Tracks billable usage for fire & life safety sector
   - Columns: `video_minutes_billed`, `cost_usd`, `billed_amount_usd`, `rate_per_minute`
   - Used for invoicing and customer billing

### 3.3 Data Flow

```
Video Upload → processSession.js
  ↓
getVideoDuration() → Extract duration (seconds)
  ↓
Process frames → Track frames_analyzed
  ↓
logVideoUsage() → Write to:
  ├─ usage_events (all sectors)
  └─ building_video_usage (usage-based only)
```

---

## 4. Billing Logic by Sector

### 4.1 Restaurant/Food Service (Flat Rate)

**Subscription**: $50/month via Stripe

**Metering**: 
- Video duration tracked internally
- NO billing based on usage
- Used only for analytics and soft limit monitoring

**User Experience**:
- Sees: "Unlimited inspections included"
- Does NOT see: Frame counts, video minutes, costs

**Implementation**:
```javascript
if (sector === 'food_safety') {
  // Track for analytics only
  await logVideoUsage({ ...params })
  // No billing calculation needed
}
```

### 4.2 Rental Housing (Flat Rate)

**Subscription**: $10/month OR $100/year via Stripe

**Metering**:
- Same as Restaurant - tracked but not billed
- Very light usage expected (<10 min video/month)

**User Experience**:
- Sees: "Monthly or annual subscription - unlimited use"
- Does NOT see: Usage details

**Implementation**: Same as Restaurant

### 4.3 Buildings/Fire Safety (Usage-Based)

**Subscription**: Pay-per-use ($0.50/minute of video)

**Metering**:
- Video duration tracked and BILLED
- Stored in `building_video_usage` table
- Invoiced monthly via Stripe

**User Experience**:
- Sees: "45 minutes processed - $22.50"
- Clear breakdown of duration and cost
- Running total for billing period

**Implementation**:
```javascript
if (sector === 'fire_life_safety') {
  const minutes = Math.ceil(videoDuration / 60)
  const costInfo = calculateUsageCost(sector, { videoMinutes: minutes })
  
  await logVideoUsage({
    ...params,
    videoDurationSeconds: videoDuration,
  })
  
  // costInfo.cost = AI processing cost
  // costInfo.billable = true
  // Cost is automatically written to building_video_usage table
}
```

---

## 5. Stripe Integration

### 5.1 Product Setup

**Create Stripe Products**:

1. **Restaurant Subscription**
   - Product: "Restaurant Food Safety Compliance"
   - Price: $50/month recurring
   - Price ID: `price_restaurant_monthly`

2. **Rental Housing Subscription**
   - Product: "Rental Housing Compliance"
   - Prices:
     - $10/month recurring → `price_rental_monthly`
     - $100/year recurring → `price_rental_annual`

3. **Buildings Usage-Based**
   - Product: "Building Fire & Life Safety Inspections"
   - Metered billing: Based on usage
   - Usage type: "video_minutes"
   - Price: $0.50 per unit (minute)
   - Price ID: `price_buildings_metered`

### 5.2 Checkout Flow

**Flat Rate Sectors**:
```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: PRICE_ID, // restaurant or rental
    quantity: 1,
  }],
  metadata: { sector: 'food_safety' }
})
```

**Usage-Based Sector**:
```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: PRICE_BUILDINGS_METERED,
  }],
  metadata: { sector: 'fire_life_safety' }
})
```

### 5.3 Usage Reporting to Stripe

**For Buildings Sector Only**:

```javascript
// Monthly job to report usage to Stripe
async function reportUsageToStripe(userId, billingPeriod) {
  const subscription = await getActiveSubscription(userId)
  
  if (subscription.sector !== 'fire_life_safety') return
  
  const summary = await getVideoUsageSummary(
    userId,
    'fire_life_safety',
    billingPeriod.start,
    billingPeriod.end
  )
  
  // Report to Stripe
  await stripe.subscriptionItems.createUsageRecord(
    subscription.stripe_subscription_item_id,
    {
      quantity: summary.totalMinutes,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'set', // Set total for the period
    }
  )
}
```

---

## 6. User Interface Display

### 6.1 Restaurant/Rental Users

**Dashboard Display**:
```
┌─────────────────────────────────────┐
│ Your Plan: Restaurant ($50/month)   │
│                                     │
│ ✓ Unlimited weekly inspections     │
│ ✓ All features included            │
│                                     │
│ This month: 8 inspections completed │
└─────────────────────────────────────┘
```

**DO NOT SHOW**:
- Frame counts
- Video duration
- API call counts
- Processing costs

### 6.2 Building Users

**Dashboard Display**:
```
┌─────────────────────────────────────┐
│ Your Plan: Buildings (Usage-Based)  │
│                                     │
│ Current Month Usage:                │
│ • 145 minutes processed             │
│ • 3 inspections completed           │
│                                     │
│ Estimated Cost: $72.50              │
│ (145 min × $0.50/min)               │
│                                     │
│ Last inspection: 45 min - $22.50    │
└─────────────────────────────────────┘
```

**SHOW**:
- Video duration in minutes
- Per-minute rate
- Cost breakdown
- Period total

**DO NOT SHOW**:
- Frame counts
- Individual API calls

---

## 7. Soft Usage Limits

### 7.1 Purpose

- **Internal monitoring only** - not enforced
- Detect potential abuse or anomalies
- Trigger admin alerts at threshold

### 7.2 Recommended Limits

| Sector | Monthly Images | Monthly Video (min) | Alert Threshold |
|--------|----------------|---------------------|-----------------|
| Restaurant | 100 | 20 | 80% |
| Rental | 50 | 10 | 80% |
| Buildings | No limit | No limit | N/A |

### 7.3 Implementation

**File**: `lib/videoUsageTracking.js`

```javascript
const limitStatus = await checkSoftUsageLimits(userId, sector)

if (limitStatus.shouldAlert) {
  // Send admin notification
  await sendAdminAlert({
    userId,
    sector,
    usage: limitStatus.usage,
    message: limitStatus.message
  })
}

// Never block the request
return { allowed: true, ...limitStatus }
```

### 7.4 Admin Dashboard

Show alerts for users exceeding thresholds:
- User ID
- Sector
- Current usage vs. limit
- Percentage over threshold
- Recommendation: "Review account for unusual activity"

---

## 8. Database Queries

### 8.1 Get User's Current Usage

```sql
SELECT 
  SUM(video_minutes_billed) as total_minutes,
  SUM(billed_amount_usd) as total_cost,
  COUNT(*) as session_count
FROM building_video_usage
WHERE user_id = $1
  AND created_at >= DATE_TRUNC('month', NOW())
  AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
```

### 8.2 Get Usage History

```sql
SELECT 
  session_id,
  video_duration_seconds,
  video_minutes_billed,
  billed_amount_usd,
  created_at
FROM building_video_usage
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

### 8.3 Monthly Summary (All Users)

```sql
SELECT * FROM building_usage_summary
WHERE billing_month = DATE_TRUNC('month', NOW())
ORDER BY total_billed DESC;
```

---

## 9. Migration Path

### 9.1 Phase 1: Cost Analysis (Complete)
- ✅ Document current costs
- ✅ Create COST_ANALYSIS.md
- ✅ Update sectors.js with new pricing

### 9.2 Phase 2: Video Tracking (Complete)
- ✅ Implement `lib/videoUsageTracking.js`
- ✅ Update `processSession.js` to track duration
- ✅ Create database schema (SQL file)

### 9.3 Phase 3: Stripe Setup (TODO)
- [ ] Create Stripe products and prices
- [ ] Update checkout flows
- [ ] Test subscription creation
- [ ] Implement usage reporting for buildings

### 9.4 Phase 4: UI Updates (TODO)
- [ ] Update dashboard for sector-based display
- [ ] Add usage widgets for building users
- [ ] Hide technical details from flat-rate users
- [ ] Add soft limit alerts for admins

### 9.5 Phase 5: Activation (TODO)
- [ ] Activate fire_life_safety sector
- [ ] Activate rental_housing sector
- [ ] Enable new pricing in production
- [ ] Monitor and adjust

---

## 10. Testing Checklist

### 10.1 Restaurant Sector
- [ ] Subscribe at $50/month
- [ ] Upload images and short videos
- [ ] Verify no usage charges appear
- [ ] Check only "unlimited" message shown
- [ ] Confirm usage tracked internally

### 10.2 Rental Sector
- [ ] Subscribe at $10/month and $100/year
- [ ] Upload minimal media
- [ ] Verify no usage charges
- [ ] Confirm light usage tracking

### 10.3 Buildings Sector
- [ ] Create usage-based subscription
- [ ] Upload 10-minute video
- [ ] Verify duration tracked correctly
- [ ] Check cost calculated: 10 min × $0.50 = $5.00
- [ ] Confirm cost displayed to user
- [ ] Verify Stripe usage record created

### 10.4 Cross-Cutting
- [ ] Test soft limit monitoring
- [ ] Verify admin alerts trigger
- [ ] Confirm sector-based access control
- [ ] Test analytics dashboard
- [ ] Validate RLS policies

---

## 11. Cost Optimization Opportunities

### 11.1 Critical: Rerank Optimization

**Current Cost**: 92% of total (see COST_ANALYSIS.md)

**Optimization**: Selective reranking
```javascript
// Only rerank for critical/major violations
if (severity === 'critical' || severity === 'major') {
  const citations = await searchRegulations(searchQuery, 3)
}
```

**Impact**: 70-80% cost reduction for buildings sector

### 11.2 Adaptive Frame Sampling

**Current**: 1 FPS for all videos

**Optimization**: Sector-specific rates
```javascript
const fps = sector === 'food_safety' ? 1.0 : 0.5
```

**Impact**: 50% frame reduction for buildings/rental

### 11.3 Citation Caching

**Optimization**: Cache common violation citations
- Build lookup table for top 20 violations
- Skip rerank if citation already cached
- Update cache monthly

**Impact**: Additional 20-30% rerank reduction

---

## 12. Monitoring & Alerts

### 12.1 Key Metrics

Track in admin dashboard:
- Cost per minute (by sector)
- Frame analysis efficiency
- Rerank usage percentage
- Soft limit violations
- Average inspection duration

### 12.2 Cost Alerts

Trigger if:
- Per-minute cost exceeds $0.40 (target: $0.20-0.30)
- Building inspection exceeds 90 minutes
- Soft limits exceeded by >120%
- Unusual spike in usage

### 12.3 Quality Metrics

Monitor:
- Violation detection rate
- False positive rate
- Average confidence scores
- Customer satisfaction

---

## 13. Compliance & Legal

### 13.1 Terms of Service

**Key Clauses**:
- System is advisory only
- No compliance decisions made
- Results for reference purposes
- No liability for missed violations
- Usage limits subject to change
- Pricing subject to change with notice

### 13.2 Data Retention

**Videos**: 90 days
**Reports**: Indefinite
**Usage Records**: 7 years (for billing/tax purposes)

### 13.3 Privacy

- Videos not shared with third parties
- AI processing via Cohere (see Cohere DPA)
- Usage data aggregated and anonymized for analytics
- User can request data deletion

---

## 14. Support & Documentation

### 14.1 User Documentation

**Restaurant/Rental**:
- "Getting Started with Unlimited Inspections"
- "How to Upload Photos and Videos"
- "Understanding Your Compliance Report"

**Buildings**:
- "Usage-Based Pricing Explained"
- "Optimizing Video Length for Cost"
- "Reading Your Monthly Bill"

### 14.2 Internal Documentation

- API integration guide
- Database schema reference
- Cost analysis report
- Billing troubleshooting guide

---

## Conclusion

This architecture supports three distinct pricing models with appropriate metering, billing, and user experience for each sector. The key principles are:

1. **Internal metering** for all usage
2. **Selective billing** based on sector
3. **User-appropriate transparency** (hide complexity for flat rates, show details for usage-based)
4. **Soft limits** for monitoring, not enforcement
5. **Cost optimization** opportunities identified and ready to implement

**Next Steps**: Implement Phase 3 (Stripe setup) and Phase 4 (UI updates) when ready to activate new sectors.

---

*Document Version: 1.0*  
*Last Updated: 2025-12-28*  
*Prepared by: Billing Architecture Team*
