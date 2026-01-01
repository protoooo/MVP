# Setup and Configuration Guide

## Overview
This guide will walk you through setting up the naiborhood business automation platform. The platform requires configuration of several external services: Supabase (database & storage), Cohere (AI), and Stripe (payments).

## Prerequisites
- Node.js 18+ and npm
- A Supabase account
- A Cohere API account
- A Stripe account

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning (2-3 minutes)
3. Go to Project Settings → API
4. Copy the following values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Run Database Migrations
1. Install Supabase CLI: `npm install -g supabase`
2. Link your project: `supabase link --project-ref your-project-ref`
3. Run migrations:
   ```bash
   supabase db push
   ```
   Or manually run the SQL files in this order:
   - `supabase/migrations/20240101000000_initial_schema.sql`
   - `supabase/migrations/20240101000001_agent_memory_tables.sql`
   - `supabase/migrations/20240102000000_auth_and_subscriptions.sql`

### Create Storage Bucket
1. In Supabase Dashboard, go to Storage
2. Create a new bucket named `business-documents`
3. Set it to **Public** (we'll use RLS for security)
4. Go to bucket policies and add:
   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Users can upload own files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'business-documents' 
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Allow authenticated users to view own files
   CREATE POLICY "Users can view own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'business-documents'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Allow authenticated users to delete own files
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'business-documents'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

### Enable pgvector Extension
1. In Supabase Dashboard, go to Database → Extensions
2. Search for `vector` and enable the `pgvector` extension
3. This is required for semantic search capabilities

## 2. Cohere API Setup

### Get Your API Key
1. Go to [dashboard.cohere.com](https://dashboard.cohere.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key or copy your existing key
5. Set `COHERE_API_KEY` in your environment

### APIs Used
The platform uses the following Cohere APIs:
- **Command-R-Plus**: Main chat and generation model
- **Embed v3.0**: Document embeddings for semantic search
- **Rerank v3.0**: Document reranking for better search results
- **Classify**: Text classification for categorization
- **Aya Vision**: (Optional) For image analysis in documents

## 3. Stripe Setup

### Create Stripe Account and Get Keys
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in
3. Go to Developers → API Keys
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### Create the $50/Month Product
1. In Stripe Dashboard, go to Products
2. Click "Add product"
3. Fill in:
   - Name: "Unlimited Plan"
   - Description: "Unlimited access to all agents and features"
   - Pricing: Recurring, $50.00 USD per month
4. Save and copy the **Price ID** → `STRIPE_PRICE_ID`

### Set Up Webhook
1. In Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL to: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 4. Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
# Cohere
COHERE_API_KEY=your_cohere_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 5. Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 6. Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Add all environment variables in Railway dashboard
3. Railway will auto-deploy on push

### Vercel Deployment
1. Import your GitHub repository
2. Add environment variables in project settings
3. Deploy

### Important Notes for Production
- Use production Stripe keys (not test keys)
- Set `NEXT_PUBLIC_BASE_URL` to your actual domain
- Update webhook URLs to your production domain
- Enable Supabase RLS (Row Level Security) policies
- Enable Supabase Auth email verification

## 7. Testing

### Test Account Creation
1. Go to `/signup`
2. Create an account
3. Complete onboarding
4. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC

### Test Document Upload
1. Go to Dashboard → Upload Documents
2. Upload a sample PDF or Excel file
3. Verify it appears in the list

### Test Agents
1. Click on any agent (HR, Financial, etc.)
2. Start a conversation
3. Ask questions about your business

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check that migrations ran successfully
- Ensure pgvector extension is enabled

### Storage Upload Errors
- Verify storage bucket exists and is named `business-documents`
- Check RLS policies are correctly set
- Ensure bucket is set to public

### Stripe Webhook Issues
- Verify webhook secret is correct
- Check webhook endpoint is publicly accessible
- Review Stripe Dashboard → Webhooks for error logs

### Cohere API Errors
- Verify API key is valid
- Check you have sufficient credits
- Ensure you're using correct model names

## Support

For issues or questions:
1. Check the error logs in browser console
2. Check Supabase logs in dashboard
3. Check Stripe webhook logs
4. Review Cohere API dashboard for errors

## Next Steps

After setup:
1. Customize industry templates in the database
2. Configure automated report schedules
3. Set up email sending integration (future feature)
4. Add calendar integration for HR scheduling (future feature)
5. Configure invoice generation (future feature)
