# Cost Analysis & Pricing Strategy
## protocolLM - Michigan Food Safety Compliance

**Target Market**: 44,000 food service establishments in Michigan  
**Launch Date**: January 2025

---

## Current Tech Stack

### Cohere API Services
1. **c4ai-aya-vision-32b** - Multi-modal vision model for image/video analysis
2. **rerank-v4.0-pro** - Document reranking for improved search relevance
3. **embed-v4.0** - Text embeddings for semantic search
4. **command-r7b-12-2024** - Text generation and chat

### Processing Flow Per Upload Session
1. **Image Processing**:
   - Upload → Store in Supabase → 1 AYA Vision API call per image
   - Analysis extracts violations, compliance checks, recommendations
   
2. **Video Processing**:
   - Upload → Extract frames @ 1 fps → Deduplicate similar frames
   - Each unique frame = 1 AYA Vision API call
   - Example: 30-second video = ~30 frames → ~15-25 unique frames after dedup
   
3. **Report Generation**:
   - Compile findings → Cross-check Michigan regulations
   - Generate PDF with violations, fixes, citations
   - Uses embeddings for regulation lookup
   - Optional rerank for better regulation matching

---

## Cohere Pricing (December 2024 estimates)

**Note**: Verify current pricing at https://cohere.com/pricing

### Model Costs (approximate)
- **AYA Vision 32B**: $1.00-1.50 per 1,000 images
- **Rerank 4.0**: $0.50 per 1,000 searches  
- **Embed 4.0**: $0.10 per 1,000 embeddings
- **Command models**: $0.50-2.50 per 1M tokens

---

## Usage Scenarios

### Light Usage (5 uploads/month per location)
**Assumptions**:
- 2,000 locations active (4.5% of market)
- Average 3 images or 1 short video per session
- 5 sessions per location per month

**Monthly Volume**:
- 10,000 sessions
- ~30,000 media items
- ~40,000 vision API calls (accounting for video frames)

**Estimated Monthly Cost**:
- Vision API: $40-60
- Embeddings: $5-10
- Rerank: $5-10
- Text generation: $10-20
- **Total: $60-100/month**
- **Cost per location: $0.03-0.05**

**Suggested Pricing**: 
- $15-20/device/month
- Gross margin: 99%+ at scale

---

### Medium Usage (20 uploads/month per location)
**Assumptions**:
- 5,000 locations active (11% of market)
- Average 4 images or 1 medium video per session
- 20 sessions per location per month

**Monthly Volume**:
- 100,000 sessions
- ~400,000 media items
- ~550,000 vision API calls

**Estimated Monthly Cost**:
- Vision API: $550-825
- Embeddings: $50-75
- Rerank: $50-75
- Text generation: $100-150
- **Total: $750-1,125/month**
- **Cost per location: $0.15-0.23**

**Suggested Pricing**: 
- $25-35/device/month
- Gross margin: 98-99%

---

### Heavy Usage (50 uploads/month per location)
**Assumptions**:
- 10,000 locations active (23% of market)
- Average 5 images or 2 videos per session
- 50 sessions per location per month

**Monthly Volume**:
- 500,000 sessions
- ~2,500,000 media items
- ~3,500,000 vision API calls

**Estimated Monthly Cost**:
- Vision API: $3,500-5,250
- Embeddings: $250-400
- Rerank: $250-400
- Text generation: $500-750
- **Total: $4,500-6,800/month**
- **Cost per location: $0.45-0.68**

**Suggested Pricing**: 
- $40-60/device/month
- Gross margin: 98-99%

---

## Pricing Strategy Recommendations

### Option 1: Flat Unlimited (Current Model) ✅ RECOMMENDED
**Price**: $25/device/month + 14-day free trial

**Pros**:
- Simple, predictable for customers
- Easy to explain and sell
- Reduces support burden (no usage tracking complaints)
- High perceived value
- Your current implementation

**Cons**:
- Risk of abuse (mitigated by per-device licensing)
- May leave money on table with heavy users

**Recommended for**: Initial launch, market entry

---

### Option 2: Tiered Pricing
**Starter**: $15/device/month (up to 10 uploads/month)  
**Professional**: $30/device/month (up to 50 uploads/month)  
**Enterprise**: $50/device/month (unlimited)

**Pros**:
- Captures more value from heavy users
- Provides entry point for budget-conscious customers

**Cons**:
- More complex to manage
- Requires usage tracking and enforcement
- May deter customers worried about overages

**Recommended for**: After 6-12 months of operation

---

### Option 3: Pay-As-You-Go
**Price**: $0.50-1.00 per report generated

**Pros**:
- Zero commitment for customers
- Scales perfectly with usage
- Easy A/B testing

**Cons**:
- Unpredictable revenue
- Requires payment processing per transaction
- Higher customer acquisition friction

**Recommended for**: Complementary offering, not primary model

---

## Market Penetration Scenarios

### Conservative (Year 1)
- 2% market penetration (880 locations)
- Average 10 uploads/month per location
- **Revenue**: $264K/year @ $25/device
- **Cost**: $2,000-3,000/year
- **Gross Margin**: 98-99%
- **Net**: ~$261K after API costs

### Moderate (Year 2)
- 5% market penetration (2,200 locations)
- Average 15 uploads/month per location
- **Revenue**: $660K/year
- **Cost**: $6,000-9,000/year
- **Gross Margin**: 98-99%
- **Net**: ~$651K after API costs

### Aggressive (Year 3)
- 10% market penetration (4,400 locations)
- Average 20 uploads/month per location
- **Revenue**: $1.32M/year
- **Cost**: $15,000-22,000/year
- **Gross Margin**: 98-99%
- **Net**: ~$1.30M after API costs

---

## Risk Factors & Mitigation

### 1. Cohere Price Increases
**Risk**: Cohere raises prices 20-50%  
**Mitigation**: 
- Margins support 2-3x cost increase
- Lock in pricing with annual Cohere contract at scale
- Consider multi-model approach (OpenAI, Anthropic backup)

### 2. Heavy User Abuse
**Risk**: Some users upload 200+ images/day  
**Mitigation**:
- Device licensing limits to registered devices
- Implement rate limiting (e.g., 100 uploads/day/device)
- Monitor usage and contact outliers

### 3. Slow Adoption
**Risk**: Only 1% penetration in year 1  
**Mitigation**:
- Low fixed costs mean breakeven at ~50 customers
- Free trial reduces barrier to entry
- API costs scale down with usage

---

## Action Items

### Immediate (Before Launch)
- [ ] Verify current Cohere pricing
- [ ] Set up usage monitoring dashboard
- [ ] Implement rate limiting (100 uploads/day/device)
- [ ] Test with 5-10 beta customers to validate usage patterns

### Month 1-3
- [ ] Monitor actual API costs vs. projections
- [ ] Track customer usage patterns
- [ ] Survey customers on pricing perception
- [ ] Identify any abuse patterns

### Month 3-6
- [ ] Calculate actual cost per customer
- [ ] Decide if pricing adjustment needed
- [ ] Consider introducing tiered plans
- [ ] Negotiate volume pricing with Cohere if approaching $5K/month spend

---

## Conclusion

**Recommended Launch Strategy**:
- **$25/device/month unlimited** with 14-day free trial
- Focus on acquiring first 100 customers
- Monitor costs and adjust after 3-6 months of data
- Your current margins are strong (98-99%) even with heavy usage

Your current pricing model ($25/device/month unlimited) is well-positioned for market entry with excellent margins. The biggest risk is underpricing heavy users, but device licensing and rate limiting mitigate this effectively.

---

**Last Updated**: December 27, 2024  
**Next Review**: March 2025 (after 2-3 months of launch data)
