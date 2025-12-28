# Quick Reference: Pricing & Billing

## TL;DR

**3 pricing models. 1 system. Full cost visibility.**

---

## Pricing at a Glance

| Sector | Price | Model | Margin |
|--------|-------|-------|--------|
| 🍽️ Restaurant | $50/mo | Flat | 98% |
| 🏠 Rental | $10/mo or $100/yr | Flat | 98% |
| 🔥 Buildings | $0.50/min | Usage | 48%* |

*83% with optimization (critical before launch)

---

## Cost Breakdown

**Per Image**: $0.008 average  
**Per 10-Min Video**: $2.61 typical  
**Per Minute**: $0.26 average

**Cost Drivers**:
- 🔴 Rerank: 92% (OPTIMIZE THIS)
- Vision: 6%
- Embed: 2%

---

## Key Files

```
lib/sectors.js                    # Pricing model config
lib/videoUsageTracking.js         # Duration tracking
backend/functions/processSession.js   # Integration point
database_schema_pricing.sql       # DB migrations
COST_ANALYSIS.md                  # Full cost breakdown
BILLING_ARCHITECTURE.md           # Complete guide
```

---

## Usage Tracking

```javascript
// Get video duration
const duration = await getVideoDuration(videoPath)

// Log usage
await logVideoUsage({
  userId,
  sessionId,
  sector: 'fire_life_safety',
  videoDurationSeconds: duration,
  framesAnalyzed: frames.length
})

// Calculate cost
const cost = calculateUsageCost(sector, {
  videoMinutes: Math.ceil(duration / 60)
})
```

---

## Critical Optimization

**BEFORE launching buildings sector:**

```javascript
// In aiAnalysis.js, around line 494
// CURRENT: Rerank all findings (92% of cost)
const citations = await searchRegulations(searchQuery, 3)

// OPTIMIZED: Rerank only critical/major (70-80% savings)
if (severity === 'critical' || severity === 'major') {
  const citations = await searchRegulations(searchQuery, 3)
}
```

**Impact**: $15.64 → $5.00 per 60-min video

---

## Soft Limits (Internal Only)

```javascript
const limit = await checkSoftUsageLimits(userId, sector)

// limit.shouldAlert = true at 80% threshold
// limit.limited = always false (never enforced)
```

| Sector | Images/mo | Video/mo |
|--------|-----------|----------|
| Restaurant | 100 | 20 min |
| Rental | 50 | 10 min |
| Buildings | ∞ | ∞ |

---

## Database Tables

### building_video_usage
```sql
video_minutes_billed    # Rounded up
cost_usd               # AI cost
billed_amount_usd      # Customer charge
rate_per_minute        # $0.50
```

### usage_events (enhanced)
```sql
video_duration_seconds
frames_analyzed
sector
```

---

## What Users See

### Restaurant/Rental
```
✓ Unlimited inspections included
This month: 8 inspections
```
**Hide**: frames, minutes, costs

### Buildings
```
This month: 145 minutes
Cost: $72.50 (145 min × $0.50)
Last inspection: 45 min - $22.50
```
**Show**: minutes, rate, cost  
**Hide**: frames, API calls

---

## Testing Checklist

- [ ] Upload 10-min video
- [ ] Verify duration tracked
- [ ] Check cost calculation
- [ ] Validate DB record
- [ ] Test soft limits
- [ ] Verify sector access

---

## Stripe Setup (TODO)

1. **Restaurant**: Recurring $50/mo
2. **Rental**: Recurring $10/mo or $100/yr
3. **Buildings**: Metered, report usage monthly

```javascript
await stripe.subscriptionItems.createUsageRecord(
  subscriptionItemId,
  { quantity: totalMinutes }
)
```

---

## Cost Targets

✅ Restaurant: <$2/month (actual: $1.10)  
✅ Rental: <$1/month (actual: $0.19)  
⚠️ Buildings: <$0.20/min (actual: $0.26, target with optimization: $0.10)

---

## Protection Checks

✅ Food safety logic unchanged  
✅ No hard limits enforced  
✅ Tracking failures don't break processing  
✅ Graceful degradation everywhere  
✅ Advisory system only  

---

## Deploy Steps

1. Run `database_schema_pricing.sql`
2. Deploy code (already done)
3. Implement rerank optimization
4. Set up Stripe products
5. Update UI
6. Activate new sectors
7. Monitor costs

---

## Support

- 📊 Cost details: `COST_ANALYSIS.md`
- 🏗️ Architecture: `BILLING_ARCHITECTURE.md`
- 📝 Full summary: `IMPLEMENTATION_SUMMARY.md`
- 💾 DB schema: `database_schema_pricing.sql`

---

## Emergency Contacts

If costs spike unexpectedly:

1. Check Rerank usage (should be <40% after optimization)
2. Review frame sampling rate (1 FPS for food, 0.5 for others)
3. Monitor soft limit violations
4. Check for unusual usage patterns

**Dashboard metric**: Cost per minute should be $0.20-0.30

---

*Quick ref v1.0 | Updated: 2025-12-28*
