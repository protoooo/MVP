import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { ensureSeatInventory } from '@/lib/deviceSeats'

// Initialize Stripe with error handling to prevent key exposure
let stripe = null
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
} catch (error) {
  // Never expose the actual error which might contain the secret key
  console.error('[stripe-init] Failed to initialize Stripe (key hidden for security)')
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

export async function POST(req) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !webhookSecret) {
    logger.security('Webhook missing signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.security('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const subscriptionId = session.subscription
        const customerId = session.customer
        const userId = session.metadata?.userId || session.client_reference_id
        const paymentType = session.metadata?.type

        // Handle different payment types
        if (paymentType === 'tenant_report') {
          await handleTenantReport(session)
        } else if (paymentType === 'one_off_report') {
          await handleOneOffReport(session)
        } else if (paymentType === 'api_credits') {
          await handleApiCredits(session)
        } else if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionUpdate({ subscription, userId, customerId })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.userId
        const customerId = subscription.customer
        await handleSubscriptionUpdate({ subscription, userId, customerId })
        break
      }
      default:
        logger.info('Webhook event ignored', { type: event.type })
    }
  } catch (error) {
    logger.error('Webhook handling failed', { error: error.message, type: event.type })
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionUpdate({ subscription, userId, customerId }) {
  if (!subscription) return

  const quantity = subscription.items?.data?.[0]?.quantity || 1
  const status = subscription.status
  const stripeSubscriptionId = subscription.id

  if (!userId) {
    logger.warn('Subscription missing user id metadata', { stripeSubscriptionId })
    return
  }

  await supabase
    .from('stripe_subscriptions')
    .upsert(
      {
        purchaser_user_id: userId,
        stripe_customer_id: customerId || subscription.customer,
        stripe_subscription_id: stripeSubscriptionId,
        quantity,
        status,
      },
      { onConflict: 'stripe_subscription_id' }
    )

  await ensureSeatInventory({ purchaserUserId: userId, quantity })
}

// Handle tenant report payment ($20)
async function handleTenantReport(session) {
  const reportId = session.metadata?.report_id
  const accessCode = session.metadata?.access_code
  const customerEmail = session.customer_details?.email || session.customer_email
  
  if (!reportId) {
    logger.warn('Tenant report missing report_id', { sessionId: session.id })
    return
  }

  logger.info('Processing tenant report payment', { reportId, sessionId: session.id })
  
  // Update report status to paid
  const { error } = await supabase
    .from('tenant_reports')
    .update({
      payment_status: 'paid',
      stripe_payment_intent: session.payment_intent,
      payment_completed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('stripe_session_id', session.id)
  
  if (error) {
    logger.error('Failed to update tenant report payment status', { 
      reportId, 
      error: error.message 
    })
  } else {
    logger.info('Tenant report payment completed', { reportId, accessCode })
  }
}

// Handle one-off $50 report payment
async function handleOneOffReport(session) {
  const reportId = session.metadata?.reportId
  const customerEmail = session.customer_details?.email || session.customer_email
  
  if (!reportId) {
    logger.warn('One-off report missing reportId', { sessionId: session.id })
    return
  }

  logger.info('Processing one-off report payment', { reportId, sessionId: session.id })
  
  // Update report status to trigger processing
  await supabase
    .from('one_off_reports')
    .update({
      status: 'paid',
      stripe_session_id: session.id,
      customer_email: customerEmail,
      payment_amount: session.amount_total,
      paid_at: new Date().toISOString(),
    })
    .eq('id', reportId)
  
  // Trigger report generation (will be handled by a separate process or queue)
  // For now, we mark it as ready for processing
  logger.info('One-off report marked as paid', { reportId })
}

// Handle API credits purchase
async function handleApiCredits(session) {
  const tier = session.metadata?.tier
  const credits = parseInt(session.metadata?.credits || '0')
  const customerEmail = session.customer_details?.email || session.customer_email
  
  if (!tier || !credits || !customerEmail) {
    logger.warn('API credits purchase missing metadata', { sessionId: session.id })
    return
  }

  logger.info('Processing API credits purchase', { tier, credits, customerEmail })
  
  // Generate API key via internal endpoint
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credits,
        customerEmail,
        stripeSessionId: session.id,
        tier,
      }),
    })
    
    const data = await response.json()
    if (data.success) {
      logger.info('API key generated successfully', { 
        keyId: data.keyId, 
        credits, 
        customerEmail 
      })
    } else {
      logger.error('API key generation failed', { error: data.error })
    }
  } catch (error) {
    logger.error('Failed to generate API key', { error: error.message })
  }
}
