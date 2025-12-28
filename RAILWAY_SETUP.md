# Railway Deployment Configuration

## Required Environment Variables for Railway

### Stripe Configuration

Add the following environment variable in your Railway project's **Variables** tab:

#### Inspection Report Price ID
- **Variable Name**: `NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT`
- **Value**: Your Stripe Price ID (e.g., `price_1AbcDefGhIjKlMn`)
- **Example**: `price_inspection_report_1hr_149`

### How to Add in Railway:

1. Open your Railway project dashboard
2. Click on your service (e.g., "MVP" or your app name)
3. Go to the **Variables** tab
4. Click **+ New Variable**
5. Enter:
   ```
   Key: NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT
   Value: price_1AbcDefGhIjKlMn
   ```
   (Replace with your actual Price ID)
6. Click **Add**
7. Railway will automatically redeploy your application

### Verify It's Working

After deployment, you can verify the variable is loaded by:
1. Checking the Railway logs during build
2. Testing the checkout flow on your live site
3. The checkout should use your Stripe Price ID instead of dynamic pricing

### Other Required Railway Variables

Make sure you also have these essential variables configured:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT  ← NEW

# Application
NEXT_PUBLIC_BASE_URL
```

### Testing vs Production

- **Test Mode**: Use a Price ID from Stripe test mode (e.g., `price_test_...`)
- **Production Mode**: Use a Price ID from Stripe live mode (e.g., `price_...`)

Make sure your `STRIPE_SECRET_KEY` matches the mode of your Price ID!

### Fallback Behavior

If you don't set this variable, the app will fall back to using dynamic pricing at $149. However, using a Price ID is **strongly recommended** for better:
- Analytics in Stripe
- Pricing management
- Promotional code support
- Price change history
