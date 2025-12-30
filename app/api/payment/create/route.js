import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { generatePasscode } from '@/lib/passcode'

export async function POST(request) {
  try {
    const { type, turnstileToken } = await request.json()

    // Validate analysis type
    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid analysis type' },
        { status: 400 }
      )
    }

    // Verify Turnstile token
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Please complete the verification challenge' },
        { status: 400 }
      )
    }

    console.log('Verifying Turnstile token...')
    
    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken
        })
      }
    )

    const turnstileData = await turnstileResponse.json()

    if (!turnstileData.success) {
      console.error('Turnstile verification failed:', turnstileData)
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 403 }
      )
    }

    console.log('Turnstile verification successful')

    // Initialize clients only when route is called
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Determine amount and price ID based on type
    const amount = type === 'image' ? 5000 : 20000 // $50 or $200
    const productName = type === 'image' 
      ? 'Image Compliance Analysis' 
      : 'Video Compliance Analysis (30 min)'

    // Use Stripe Price IDs if available, otherwise create inline price
    const priceId = type === 'image' 
      ? process.env.STRIPE_PRICE_ID_IMAGE 
      : process.env.STRIPE_PRICE_ID_VIDEO

    // Generate unique 5-digit passcode
    let passcode
    let isUnique = false
    
    while (!isUnique) {
      passcode = generatePasscode()
      const { data: existing } = await supabase
        .from('analysis_sessions')
        .select('id')
        .eq('passcode', passcode)
        .single()
      
      if (!existing) {
        isUnique = true
      }
    }

    // Create analysis session with passcode
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .insert({
        type,
        passcode,
        status: 'pending',
        upload_completed: false,
        input_metadata: { 
          payment_pending: true,
          turnstile_verified: true 
        },
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create analysis session' },
        { status: 500 }
      )
    }

    // Create Stripe checkout session
    let lineItems

    if (priceId) {
      // Use existing Stripe Price ID
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        }
      ]
    } else {
      // Create inline price (fallback if Price IDs not configured)
      console.warn(`No Stripe Price ID configured for ${type} - using inline price`)
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `MI Health Inspection - ${productName}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }
      ]
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upload?passcode=${passcode}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
      metadata: {
        analysis_session_id: session.id,
        analysis_type: type,
        passcode: passcode,
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      analysisId: session.id,
      passcode: passcode,
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
}
