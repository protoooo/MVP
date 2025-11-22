import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Get user's Stripe customer ID
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .single()

    if (fetchError) {
      console.error('❌ Subscription fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Could not find subscription details' },
        { status: 404 }
      )
    }

    if (!subscription?.stripe_customer_id) {
      console.error('❌ No stripe_customer_id found for user:', session.user.id)
      return NextResponse.json(
        { error: 'No active subscription found. Please contact support.' },
        { status: 404 }
      )
    }

    // Use the environment variable properly
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/documents`

    console.log('✅ Creating portal session for customer:', subscription.stripe_customer_id)
    console.log('✅ Return URL:', returnUrl)

    // Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log('✅ Portal session created:', portalSession.id)

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('❌ Stripe portal error:', err)
    return NextResponse.json({ 
      error: err.message || 'Failed to create billing portal session' 
    }, { status: 500 })
  }
}
