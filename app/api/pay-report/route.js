// API route to handle $50 one-off report payments via Stripe Checkout
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { fileCount = 0, fileData = [], customerEmail } = body

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No files to process' }, { status: 400 })
    }

    // Create a pending report record to track this payment
    const reportId = uuidv4()
    
    await supabase.from('one_off_reports').insert([{
      id: reportId,
      file_count: fileCount,
      file_data: fileData,
      status: 'pending_payment',
      customer_email: customerEmail || null,
    }])

    // Create Stripe Checkout session for $50
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Michigan Food Safety Compliance Report',
              description: `Analysis of ${fileCount} image${fileCount > 1 ? 's' : ''}`,
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/simple/success?session_id={CHECKOUT_SESSION_ID}&report_id=${reportId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/simple?canceled=true`,
      metadata: {
        reportId,
        fileCount: fileCount.toString(),
        type: 'one_off_report',
      },
      customer_email: customerEmail || undefined,
    })

    return NextResponse.json({
      checkoutUrl: session.url,
      reportId,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('[pay-report] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment session' },
      { status: 500 }
    )
  }
}
