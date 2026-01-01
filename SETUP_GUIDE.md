# Setup Guide for Business Automation Platform

This guide will walk you through setting up the Business Automation Platform step by step.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Cohere API account (free tier works)
- A Stripe account (for payments)

## Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd MVP
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up (this may take a few minutes)

### 2.2 Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - ⚠️ Keep this secret!

### 2.3 Run Database Migrations

You have two options to run the migrations:

#### Option A: Using Supabase SQL Editor (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20240102000000_auth_and_subscriptions.sql`
5. Paste into the SQL Editor and click **Run**
6. Create another new query
7. Copy the contents of `supabase/migrations/20240103000000_add_rls_policies.sql`
8. Paste into the SQL Editor and click **Run**

#### Option B: Using Supabase CLI

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Your project ref is the part of your Supabase URL before `.supabase.co`)

3. Run the migrations:
   ```bash
   supabase db push
   ```

### 2.4 Enable pgvector Extension

1. In your Supabase dashboard, go to **Database** → **Extensions**
2. Search for **vector**
3. Enable the **vector** extension

### 2.5 Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it `business-documents`
4. Make it **Private** (not public)
5. Click **Create bucket**

## Step 3: Get API Keys

### 3.1 Cohere API Key

1. Go to [dashboard.cohere.com](https://dashboard.cohere.com)
2. Sign up or log in
3. Go to **API Keys**
4. Create a new API key or copy your existing one

### 3.2 Stripe API Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in
3. Go to **Developers** → **API keys**
4. Copy your **Publishable key** and **Secret key**
   - For testing, use the test mode keys (they start with `pk_test_` and `sk_test_`)

### 3.3 Create Stripe Product

1. In Stripe dashboard, go to **Products** → **Add product**
2. Name: "Business Automation Platform"
3. Description: "Unlimited access to all features"
4. Pricing: **Recurring** → **$50.00 / month**
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

### 3.4 Set Up Stripe Webhook (Optional, for production)

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in all the values you collected:

   ```env
   # Cohere
   COHERE_API_KEY=your_cohere_api_key_from_step_3.1

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_step_2.2
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_2.2

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx (optional)
   STRIPE_PRICE_ID=price_xxxxx

   # App
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Test the Application

1. Click **Sign Up** to create a new account
2. Complete the onboarding flow:
   - Enter your business name
   - Select your industry
   - Select your business size
3. You'll be redirected to the Stripe checkout page
4. Use Stripe's test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any 5-digit ZIP code
5. After successful payment, you'll be redirected to the dashboard

## Production Deployment

### Using Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Update `NEXT_PUBLIC_BASE_URL` to your Vercel domain
6. Deploy!

### Using Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Create a new project from your GitHub repo
4. Add all environment variables
5. Update `NEXT_PUBLIC_BASE_URL` to your Railway domain
6. Deploy!

## Troubleshooting

### "Failed to complete onboarding" error

This error typically occurs when Row Level Security (RLS) policies are not set up correctly.

**Solution:**
1. Make sure you ran **both** migration files in Step 2.3
2. Verify the migrations ran successfully by checking the **Database** → **Tables** in Supabase dashboard
3. You should see tables like `user_profiles`, `subscriptions`, etc.
4. Check the **Authentication** → **Policies** section to ensure RLS policies are created

### Database connection errors

**Solution:**
1. Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
2. Make sure there are no extra spaces or quotes around the values
3. Verify your Supabase project is running (not paused)

### Stripe checkout not working

**Solution:**
1. Verify your `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are correct
2. Make sure you're using the correct mode (test vs. production)
3. Check that your `STRIPE_PRICE_ID` matches your subscription product

## Need Help?

If you encounter any issues not covered here, please:
1. Check the [GitHub Issues](link-to-issues)
2. Review the [README.md](README.md) for additional information
3. Open a new issue with detailed information about your problem
