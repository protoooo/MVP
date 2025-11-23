import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function createSupabaseServer() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}

export async function POST(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
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

    // FIX: Dynamic Base URL calculation
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const returnUrl = `${origin}/documents`

    console.log('✅ Creating portal session for customer:', subscription.stripe_customer_id)
    console.log('✅ Return URL:', returnUrl)

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
