import Stripe from 'stripe';

// Stripe is optional - app works without it
const isStripeConfigured = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_')
);

if (!isStripeConfigured && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  Stripe not configured. App will work without payment gate.');
}

export const stripe = isStripeConfigured
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Single plan - just "paid access"
export const ACCESS_PLAN = {
  name: 'Full Access',
  price: 29, // Change this to whatever you want to charge
  priceId: process.env.STRIPE_PRICE_ID || null,
  features: [
    'Unlimited API calls',
    'Unlimited documents',
    'Unlimited conversations',
    'Priority support'
  ]
};

export const isStripeEnabled = () => isStripeConfigured;
