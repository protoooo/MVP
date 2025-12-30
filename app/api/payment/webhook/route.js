import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const analysisSessionId = session.metadata.analysis_session_id
    const analysisType = session.metadata.analysis_type

    // Create payment record
    await supabase.from('payments').insert({
      stripe_payment_intent_id: session.payment_intent,
      analysis_type: analysisType,
      amount: session.amount_total,
      currency: session.currency,
      status: 'succeeded',
      session_id: analysisSessionId,
    })

    // Update analysis session to mark payment as complete
    await supabase
      .from('analysis_sessions')
      .update({
        input_metadata: { payment_verified: true },
      })
      .eq('id', analysisSessionId)
  }

  return NextResponse.json({ received: true })
}
