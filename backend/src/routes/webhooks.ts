// backend/src/routes/webhooks.ts
import { Router, Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { query } from '../config/database';
import Stripe from 'stripe';

const router = Router();

const isStripeConfigured = !!stripe;

if (!isStripeConfigured) {
  console.error('❌ Stripe not configured - webhooks disabled');
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Webhook endpoint - must use raw body
router.post('/stripe', async (req: Request, res: Response) => {
  if (!isStripeConfigured) {
    return res.status(503).json({ error: 'Webhook service not available' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    if (WEBHOOK_SECRET) {
      event = stripe!.webhooks.constructEvent(
        req.body,
        sig as string,
        WEBHOOK_SECRET
      );
    } else {
      console.warn('⚠️  Webhook signature verification disabled (no STRIPE_WEBHOOK_SECRET)');
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const existingEvent = await query(
      'SELECT id FROM stripe_webhook_events WHERE event_id = $1',
      [event.id]
    );

    if (existingEvent.rows.length > 0) {
      console.log(`Duplicate webhook event ignored: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }

    await query(
      `INSERT INTO stripe_webhook_events (event_id, event_type, payload)
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event)]
    );
  } catch (error: any) {
    console.error('Error checking/storing webhook event:', error);
  }

  console.log(`Received webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error handling webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  await query(
    `INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, status
    ) VALUES ($1, $2, $3, 'active')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      stripe_customer_id = $2,
      stripe_subscription_id = $3,
      status = 'active',
      updated_at = NOW()`,
    [parseInt(userId), customerId, subscriptionId]
  );

  console.log(`✅ Checkout completed for user ${userId}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);

  const customerId = subscription.customer as string;

  const result = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) {
    console.error('No user found for customer:', customerId);
    return;
  }

  const userId = result.rows[0].user_id;

  await updateSubscriptionRecord(userId, subscription);
  console.log(`✅ Subscription created for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);

  const customerId = subscription.customer as string;

  const result = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) {
    console.error('No user found for customer:', customerId);
    return;
  }

  const userId = result.rows[0].user_id;

  await updateSubscriptionRecord(userId, subscription);
  console.log(`✅ Subscription updated for user ${userId}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id);

  const customerId = subscription.customer as string;

  const result = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) {
    console.error('No user found for customer:', customerId);
    return;
  }

  const userId = result.rows[0].user_id;

  await query(
    `UPDATE subscriptions
     SET status = 'canceled',
         canceled_at = NOW(),
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  console.log(`✅ Subscription canceled for user ${userId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);

  const customerId = invoice.customer as string;

  const result = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) {
    console.error('No user found for customer:', customerId);
    return;
  }

  const userId = result.rows[0].user_id;

  await query(
    `UPDATE subscriptions
     SET status = 'past_due',
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  console.log(`⚠️  Payment failed for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);

  const customerId = invoice.customer as string;

  const result = await query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) {
    console.error('No user found for customer:', customerId);
    return;
  }

  const userId = result.rows[0].user_id;

  await query(
    `UPDATE subscriptions
     SET status = 'active',
         updated_at = NOW()
     WHERE user_id = $1 AND status != 'canceled'`,
    [userId]
  );

  console.log(`✅ Payment succeeded for user ${userId}`);
}

async function updateSubscriptionRecord(userId: number, subscription: Stripe.Subscription) {
  // CRITICAL FIX: Access properties correctly with proper null checks
  const subscriptionData: any = subscription;
  
  const trialStart = subscriptionData.trial_start 
    ? new Date(subscriptionData.trial_start * 1000) 
    : null;
  const trialEnd = subscriptionData.trial_end 
    ? new Date(subscriptionData.trial_end * 1000) 
    : null;
  
  // Use currentPeriodStart and currentPeriodEnd (camelCase in newer Stripe versions)
  const currentPeriodStart = subscriptionData.currentPeriodStart 
    ? new Date(subscriptionData.currentPeriodStart * 1000)
    : subscriptionData.current_period_start
    ? new Date(subscriptionData.current_period_start * 1000)
    : new Date();
    
  const currentPeriodEnd = subscriptionData.currentPeriodEnd
    ? new Date(subscriptionData.currentPeriodEnd * 1000)
    : subscriptionData.current_period_end
    ? new Date(subscriptionData.current_period_end * 1000)
    : new Date();

  await query(
    `UPDATE subscriptions
     SET stripe_subscription_id = $1,
         status = $2,
         trial_start = $3,
         trial_end = $4,
         current_period_start = $5,
         current_period_end = $6,
         cancel_at_period_end = $7,
         updated_at = NOW()
     WHERE user_id = $8`,
    [
      subscription.id,
      subscription.status,
      trialStart,
      trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      subscription.cancel_at_period_end || false,
      userId,
    ]
  );
}

export default router;
