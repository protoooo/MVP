// API route to generate API keys for prepaid credit packs
// Called by Stripe webhook when Payment Link purchase is completed
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { emails } from '@/lib/emails'

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

    // Send email to customer with API key
    try {
      const customerName = customerEmail.split('@')[0] // Extract name from email
      const emailResult = await emails.apiKeyDelivery(
        customerEmail,
        customerName,
        apiKey,
        credits,
        tier,
        expiresAt.toISOString()
      )

      if (emailResult.success) {
        console.log(`[generate-api-key] Email sent successfully to ${customerEmail}`)
      } else {
        console.error(`[generate-api-key] Email failed:`, emailResult.error)
        // Note: We don't fail the API key generation if email fails
        // The API key is still valid and stored in the database
      }
    } catch (emailError) {
      console.error('[generate-api-key] Email exception:', emailError)
      // Continue - email failure shouldn't prevent API key generation
    }

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
