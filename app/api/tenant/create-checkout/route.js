import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { generateSecretLink, generateAccessCode } from '@/backend/utils/secretLinks'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Create Stripe checkout session for tenant report payment
 * POST /api/tenant/create-checkout
 */
export async function POST(req) {
  if (!stripe || !supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { customerEmail, propertyAddress, photoCount } = body

    // Validate input
    if (!customerEmail || !customerEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!photoCount || photoCount < 1 || photoCount > 200) {
      return NextResponse.json({ 
        error: 'Photo count must be between 1 and 200' 
      }, { status: 400 })
    }

    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'

    // Check rate limit (max 5 attempts per hour per IP)
    const { data: rateLimitCheck } = await supabase
      .rpc('check_rate_limit', {
        p_ip_address: ip,
        p_action_type: 'payment',
        p_max_attempts: 5,
        p_window_minutes: 60
      })

    if (rateLimitCheck && rateLimitCheck.length > 0 && !rateLimitCheck[0].allowed) {
      return NextResponse.json({ 
        error: 'Too many payment attempts. Please try again later.',
        reset_time: rateLimitCheck[0].reset_time
      }, { status: 429 })
    }

    // Generate unique access code and secret link for the report
    const accessCode = generateAccessCode() // e.g., ABC12345
    const secretLink = generateSecretLink() // e.g., ax72-99p3-z218-k4m5

    // Create Stripe checkout session FIRST (so we have the session ID for the database)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Michigan Tenant Condition Report',
              description: `Professional habitability report for ${photoCount} photo${photoCount > 1 ? 's' : ''}`,
            },
            unit_amount: 2000, // $20.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'tenant_report',
        photo_count: photoCount,
        access_code: accessCode
      },
      success_url: `${baseUrl}/tenant/upload?session_id={CHECKOUT_SESSION_ID}&code=${accessCode}`,
      cancel_url: `${baseUrl}/tenant?canceled=true`,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    })

    // Create tenant report record with stripe_session_id included
    const { data: reportData, error: reportError } = await supabase
      .from('tenant_reports')
      .insert({
        stripe_session_id: session.id,
        customer_email: customerEmail,
        property_address: propertyAddress || null,
        total_photos: photoCount,
        status: 'pending',
        payment_status: 'pending',
        access_code: accessCode,
        secret_link: secretLink,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || null
      })
      .select()
      .single()

    if (reportError) {
      console.error('[tenant-checkout] Failed to create report record:', reportError)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }

    const reportId = reportData.id

    // Update Stripe session metadata with report_id (now that we have it)
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        type: 'tenant_report',
        report_id: reportId,
        photo_count: photoCount,
        access_code: accessCode
      }
    })

    // Record rate limit attempt
    await supabase.rpc('record_rate_limit_attempt', {
      p_ip_address: ip,
      p_action_type: 'payment',
      p_window_minutes: 60
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      reportId,
      accessCode,
      secretLink
    })

  } catch (error) {
    console.error('[tenant-checkout] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 })
  }
}
