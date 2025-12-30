# Deployment Checklist - Michigan Tenant Report System

## Pre-Deployment Setup

### 1. Database (Supabase) ✅
- [ ] Run `database/schema-tenant-reports.sql` in Supabase SQL Editor
- [ ] Create storage buckets:
  - [ ] `tenant-photos` (public)
  - [ ] `tenant-reports` (public)
- [ ] Verify Row Level Security (RLS) is enabled
- [ ] Test database functions (rate limiting, duplicate detection)

### 2. Environment Variables
Copy these to your hosting platform (Railway/Vercel):

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere AI (Vision AYA-32B, Embed 4.0, Rerank 4.0)
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 3. Stripe Configuration
- [ ] Create product: "Michigan Tenant Condition Report"
  - Price: $20.00 (one-time)
  - Metadata: `type=tenant_report`, `max_photos=200`
- [ ] Set up webhook endpoint: `https://your-domain.com/api/billing/webhook`
- [ ] Select events: `checkout.session.completed`
- [ ] Copy webhook secret to environment variables
- [ ] Test payment flow in Stripe test mode first

### 4. Hosting Platform Setup (Railway/Vercel)
- [ ] Connect GitHub repository
- [ ] Configure build command: `npm run build`
- [ ] Configure start command: `npm start`
- [ ] Set environment variables
- [ ] Configure custom domain
- [ ] Enable HTTPS/SSL (automatic on most platforms)
- [ ] Set up error monitoring (optional: Sentry)

### 5. Domain & DNS
- [ ] Purchase domain (recommended: tenantreport.com or similar)
- [ ] Configure DNS records to point to hosting platform
- [ ] Verify SSL certificate is active
- [ ] Test HTTPS redirect

## Testing Checklist

### End-to-End Flow
- [ ] Visit homepage → redirects to /tenant
- [ ] Fill out form with test email and property address
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify redirect to upload page with access code
- [ ] Upload photos with EXIF data (use phone photos with GPS)
- [ ] Submit for analysis
- [ ] Wait for report generation
- [ ] Download PDF report
- [ ] Verify PDF contains:
  - [ ] Cover page with forensic evidence package header
  - [ ] Verification of Authenticity page
  - [ ] Executive summary with Detroit statistics
  - [ ] Demand letter (Page 2)
  - [ ] Watermarked photos with timestamps
  - [ ] GPS coordinates on photos (if available)
  - [ ] AI analysis results
  - [ ] Michigan statute citations

### GPS & Metadata Testing
- [ ] Upload photo WITH GPS data → verify GPS validation
- [ ] Upload photo WITHOUT GPS → verify manual verification note
- [ ] Upload photo from different location → verify distance warning
- [ ] Verify server timestamps are recorded
- [ ] Check watermarks display correctly

### Privacy & Security
- [ ] Verify reports expire after 48 hours
- [ ] Test secret link access
- [ ] Verify expired links return 410 Gone
- [ ] Test rate limiting (try 6 payment attempts quickly)
- [ ] Verify no user data stored beyond 48 hours
- [ ] Check Privacy Policy and Terms pages load

### UI/UX
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Verify form validation works
- [ ] Check button hover states
- [ ] Test photo upload drag & drop
- [ ] Verify error messages display correctly
- [ ] Check loading states

## Post-Deployment

### Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (Sentry, LogRocket)
- [ ] Monitor Stripe webhook events
- [ ] Check Supabase database usage
- [ ] Monitor Cohere API usage and costs

### Maintenance
- [ ] Create cron job for expired report cleanup (every 6 hours)
- [ ] Set up database backups (Supabase automatic backups)
- [ ] Monitor storage usage (Supabase storage dashboard)
- [ ] Review Detroit statistics quarterly for updates

### Legal
- [ ] Verify Privacy Policy is accessible
- [ ] Verify Terms of Service is accessible
- [ ] Add legal disclaimer to footer
- [ ] Consider professional legal review of disclaimers
- [ ] Add contact email for support/questions

### Marketing
- [ ] Submit to Michigan tenant advocacy groups
- [ ] Contact Michigan Legal Help (michiganlegalhelp.org)
- [ ] Reach out to Detroit housing organizations
- [ ] Create simple landing page with clear value proposition
- [ ] Add testimonials (after initial users)

## Cost Estimates

### Per Report (~$3-4 cost, $20 revenue = $16-17 profit)
- Cohere Vision API: $0.50-2.00 (varies by photo count)
- Supabase Storage: ~$0.01
- Stripe Fee: $0.58 + 2.9% = $1.16

### Monthly Fixed Costs
- Supabase: Free tier (up to 500MB storage, 2GB bandwidth)
  - Upgrade to Pro ($25/mo) if needed
- Hosting (Railway/Vercel): $0-20/mo
- Domain: ~$12/year
- **Total**: ~$0-25/month for low volume

### Break-even: ~2-3 reports/month

## Troubleshooting

### Common Issues
1. **Photos not uploading**
   - Check Supabase storage bucket exists and is public
   - Verify file size under 10MB
   - Check CORS settings in Supabase

2. **Report generation fails**
   - Verify Cohere API key is valid
   - Check Cohere API quota/limits
   - Review server logs for errors

3. **Payment not completing**
   - Verify Stripe webhook secret is correct
   - Check Stripe dashboard for webhook events
   - Test with Stripe test mode first

4. **GPS validation not working**
   - Verify photos have EXIF GPS data
   - Check property address geocoding
   - Review distance calculation logic

5. **48-hour expiry not working**
   - Verify database trigger is created
   - Check expires_at field is being set
   - Create cron job to cleanup expired reports

## Support Resources
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- Cohere Docs: https://docs.cohere.com
- Next.js Docs: https://nextjs.org/docs
- Michigan Tenant Law: https://michiganlegalhelp.org

## Rollback Plan
If critical issues arise:
1. Disable payment processing (pause Stripe webhook)
2. Display maintenance message on homepage
3. Fix issues in staging environment
4. Re-deploy when stable
5. Re-enable payments

## Success Metrics
Track these KPIs:
- Reports generated per week
- Average photos per report
- Payment conversion rate
- User satisfaction (surveys)
- Report download rate
- 48-hour expiry compliance
- AI analysis accuracy (manual review sample)

---

**Last Updated**: December 30, 2024
**System Version**: 1.0.0
**Status**: Ready for Production Deployment
