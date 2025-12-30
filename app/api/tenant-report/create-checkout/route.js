// app/api/tenant-report/create-checkout/route.js
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { sessionId, photoCount } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Michigan Tenant Condition Report',
              description: `Professional rental condition report for ${photoCount} photo${photoCount !== 1 ? 's' : ''}`,
            },
            unit_amount: 2000, // $20.00
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/tenant-report/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tenant-report`,
      metadata: {
        sessionId,
        photoCount: photoCount.toString(),
        type: 'tenant_report',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
