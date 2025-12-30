// app/api/tenant-report/webhook/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    if (session.metadata?.type === 'tenant_report') {
      const { sessionId, photoCount } = session.metadata

      // Trigger report generation asynchronously
      try {
        // Call the generate endpoint in the background
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        fetch(`${baseUrl}/api/tenant-report/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            photoCount: parseInt(photoCount),
            stripeSessionId: session.id,
          }),
        }).catch(err => console.error('Error triggering report generation:', err))
      } catch (error) {
        console.error('Error processing webhook:', error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
