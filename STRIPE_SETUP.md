# Stripe Price Setup Instructions

## Creating the Inspection Report Price in Stripe

### Option 1: Using Stripe Dashboard (Recommended)

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **Add Product**
3. Fill in the product details:
   - **Name**: `Restaurant Health Inspection Report`
   - **Description**: `Pre-inspection video analysis for Michigan food safety compliance (up to 1 hour video)`
   - **Pricing Model**: One-time
   - **Price**: $149.00 USD
4. Click **Add pricing** 
5. After creating, you'll get a Price ID like: `price_1AbcDefGhIjKlMn`
6. **IMPORTANT**: Note down this Price ID

### Option 2: Using Stripe CLI

```bash
stripe products create \
  --name="Restaurant Health Inspection Report" \
  --description="Pre-inspection video analysis for Michigan food safety compliance (up to 1 hour video)"

# Note the product ID from the response, then create the price:
stripe prices create \
  --product=prod_XXXXX \
  --unit-amount=14900 \
  --currency=usd \
  --nickname="inspection_report_1hr_149"
```

## Recommended Price ID Name

When creating your price in Stripe, use the nickname (if using CLI) or internal reference:

**`price_inspection_report_1hr_149`**

This makes it easy to identify:
- **price_** - Indicates it's a Stripe Price object
- **inspection_report** - The product/service
- **1hr** - Duration limit
- **149** - Price in dollars

## Environment Configuration

After creating your Stripe Price, add it to your `.env` file:

```bash
# .env or .env.local
NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT=price_1AbcDefGhIjKlMn
```

Replace `price_1AbcDefGhIjKlMn` with your actual Price ID from Stripe.

## How It Works

The application will:
1. Check if `NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT` is set
2. If yes, use the Stripe Price ID (recommended - easier to update pricing in Stripe dashboard)
3. If no, fall back to hardcoded $149 price with dynamic price_data

### Benefits of Using a Price ID:
- ✅ Change pricing in Stripe Dashboard without code changes
- ✅ Better analytics and reporting in Stripe
- ✅ Easier to manage promotional pricing and coupons
- ✅ Track pricing history
- ✅ Can create multiple price points for A/B testing

## Testing

### Test Mode
For development, create a test mode price and use it in your `.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT=price_test_1AbcDefGhIjKlMn
```

### Production
For production, use your live mode price in production environment variables.

## Troubleshooting

### Price Not Working?
- Verify the Price ID is correct (starts with `price_`)
- Ensure the price is active in Stripe Dashboard
- Check that you're using the correct mode (test vs live)
- Verify environment variable is loaded: `console.log(process.env.NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT)`

### Want to Update Price?
Just create a new Price in Stripe (you can't modify an existing price), then update the environment variable.
