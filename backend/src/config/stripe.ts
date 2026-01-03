// backend/src/config/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured - subscription features disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover', // Updated to match Stripe package v20.1.0
    })
  : null;

// Stripe configuration constants
export const STRIPE_CONFIG = {
  PRICE_LOOKUP_KEY: 'small_business_monthly_25',
  TRIAL_PERIOD_DAYS: 14,
  PLAN_NAME: 'Business Plan',
  PLAN_PRICE: 2500, // $25.00 in cents
  CURRENCY: 'usd',
};

export function validateStripeConfig(): boolean {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is required');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET not set - webhook signature verification disabled');
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required for frontend');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Stripe Configuration Warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ Stripe Configuration Errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    return false;
  }

  console.log('✅ Stripe configuration validated\n');
  return true;
}
