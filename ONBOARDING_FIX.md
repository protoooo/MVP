# Quick Fix for "Failed to complete onboarding" Error

## What happened?
The onboarding page was failing on step 3 because the database tables were missing Row Level Security (RLS) policies.

## How to fix it

### Option 1: Using Supabase SQL Editor (Easiest)

1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of the file: `supabase/migrations/20240103000000_add_rls_policies.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. You should see "Success. No rows returned" - this is correct!

### Option 2: Using Supabase CLI

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Your project ref is the first part of your Supabase URL, e.g., if your URL is `https://abcdefg.supabase.co`, then `abcdefg` is your project ref)

3. Push the migrations:
   ```bash
   supabase db push
   ```

## Verify the fix

1. Go to your application's onboarding page
2. Complete all 3 steps:
   - Enter your business name
   - Select your industry (bakery, bar, brewery, retail, restaurant, or other)
   - Select your business size (1-5, 6-10, 11-25, 26-50, or 50+ employees)
3. Click "Complete Setup"
4. You should be redirected to the checkout page without any errors!

## What changed?

The fix added Row Level Security policies that allow authenticated users to:
- Create their own user profile
- Read their own user profile
- Update their own user profile

This ensures security while allowing the onboarding process to work correctly.

## Still having issues?

See the comprehensive [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions and troubleshooting.
