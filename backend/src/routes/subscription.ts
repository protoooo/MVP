// backend/src/routes/subscription.ts
import { Router } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe';
import { query } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const isStripeConfigured = !!stripe;

if (!isStripeConfigured) {
  console.error('❌ Stripe not configured - subscription routes disabled');
}

// Get current subscription status
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.email, u.tos_accepted_at, u.tos_version
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        hasSubscription: false,
        hasActiveSubscription: false,
        tosAccepted: false,
        canAccessApp: false,
      });
    }

    const subscription = result.rows[0];
    const hasActiveSubscription = ['active', 'trialing'].includes(subscription.status);
    const tosAccepted = !!subscription.tos_accepted_at;

    res.json({
      hasSubscription: true,
      hasActiveSubscription,
      tosAccepted,
      canAccessApp: hasActiveSubscription && tosAccepted,
      subscription: {
        status: subscription.status,
        planName: subscription.plan_name,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Create checkout session
router.post('/create-checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Subscription service not available' });
  }

  try {
    const { successUrl, cancelUrl } = req.body;

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Success and cancel URLs are required' });
    }

    // Check if user already has a subscription
    const existingSub = await query(
      'SELECT stripe_customer_id, stripe_subscription_id, status FROM subscriptions WHERE user_id = $1',
      [req.user!.id]
    );

    if (existingSub.rows.length > 0) {
      const sub = existingSub.rows[0];
      if (['active', 'trialing'].includes(sub.status)) {
        return res.status(400).json({ error: 'You already have an active subscription' });
      }
    }

    // Get user email
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user!.id]);
    const userEmail = userResult.rows[0].email;

    // Create or retrieve Stripe customer
    let customerId = existingSub.rows[0]?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe!.customers.create({
        email: userEmail,
        metadata: {
          userId: req.user!.id.toString(),
        },
      });
      customerId = customer.id;

      // Store customer ID
      await query(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, status)
         VALUES ($1, $2, 'incomplete')
         ON CONFLICT (user_id) 
         DO UPDATE SET stripe_customer_id = $2`,
        [req.user!.id, customerId]
      );
    }

    // Create checkout session
    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.CURRENCY,
            product_data: {
              name: STRIPE_CONFIG.PLAN_NAME,
              description: 'Unlimited document storage with AI-powered semantic search',
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: STRIPE_CONFIG.PLAN_PRICE,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.TRIAL_PERIOD_DAYS,
        metadata: {
          userId: req.user!.id.toString(),
          planName: STRIPE_CONFIG.PLAN_NAME,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.user!.id.toString(),
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/create-portal-session', authMiddleware, async (req: AuthRequest, res) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Subscription service not available' });
  }

  try {
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Return URL is required' });
    }

    // Get customer ID
    const result = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const customerId = result.rows[0].stripe_customer_id;

    // Create portal session
    const session = await stripe!.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Accept Terms of Service
router.post('/accept-terms', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tosVersion = '2025-01-03';

    await query(
      `UPDATE users 
       SET tos_accepted_at = NOW(), tos_version = $1
       WHERE id = $2`,
      [tosVersion, req.user!.id]
    );

    console.log(`✅ ToS accepted by user ${req.user!.id}`);

    res.json({ success: true, tosVersion, acceptedAt: new Date() });
  } catch (error: any) {
    console.error('Accept ToS error:', error);
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

export default router;
