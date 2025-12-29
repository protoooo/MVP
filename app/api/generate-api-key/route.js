// API route to generate API keys for prepaid credit packs
// Called by Stripe webhook when Payment Link purchase is completed
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

// Generate a secure API key
function generateApiKey() {
  return `sk_${crypto.randomBytes(32).toString('hex')}`
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { credits, customerEmail, stripeSessionId, tier } = body

    if (!credits || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: credits, customerEmail' },
        { status: 400 }
      )
    }

    // Generate API key
    const apiKey = generateApiKey()
    const keyId = uuidv4()

    // Calculate expiration (1 year from now)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Save to database
    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        id: keyId,
        key: apiKey,
        remaining_credits: credits,
        total_credits: credits,
        customer_email: customerEmail,
        expires: expiresAt.toISOString(),
        stripe_session_id: stripeSessionId,
        tier,
        active: true,
      }])
      .select()
      .single()

    if (error) {
      console.error('[generate-api-key] Database error:', error)
      throw error
    }

    // TODO: Send email to customer with API key
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log(`[generate-api-key] Generated API key for ${customerEmail}: ${apiKey}`)
    console.log(`[generate-api-key] Credits: ${credits}, Tier: ${tier}`)

    return NextResponse.json({
      success: true,
      apiKey,
      keyId,
      credits,
      expires: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[generate-api-key] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate API key' },
      { status: 500 }
    )
  }
}
