import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '50 API calls per month',
      '10 documents',
      '5 conversations',
      'Email support'
    ],
    limits: {
      apiCalls: 50,
      documents: 10,
      conversations: 5
    }
  },
  PRO: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    features: [
      '1,000 API calls per month',
      'Unlimited documents',
      'Unlimited conversations',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      apiCalls: 1000,
      documents: -1, // unlimited
      conversations: -1
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    features: [
      'Unlimited API calls',
      'Unlimited documents',
      'Unlimited conversations',
      '24/7 phone support',
      'Custom integrations',
      'Dedicated account manager'
    ],
    limits: {
      apiCalls: -1,
      documents: -1,
      conversations: -1
    }
  }
};
