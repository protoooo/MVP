// Development-only test key generation
// POST /api/dev/test-key - Generate test API key (dev only)
// Only works when NODE_ENV !== 'production'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

function generateApiKey() {
  return `sk_${crypto.randomBytes(32).toString('hex')}`
}

export async function POST(req) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Not available in production. Use Stripe payment flow or admin API.' 
    }, { status: 403 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { 
      credits = 1000, 
      tier = 'test',
      customerEmail = 'dev@localhost'
    } = body

    const apiKey = generateApiKey()
    const keyId = uuidv4()

    // Test keys expire in 30 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        id: keyId,
        key: apiKey,
        remaining_credits: credits,
        total_credits: credits,
        customer_email: customerEmail,
        expires: expiresAt.toISOString(),
        tier,
        active: true,
      }])
      .select()
      .single()

    if (error) throw error

    console.log(`[dev/test-key] Created test API key for ${customerEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Test API key created (development only)',
      keyId,
      apiKey, // Return full key for testing
      credits,
      tier,
      expires: expiresAt.toISOString(),
      dashboardUrl: `/dashboard/${keyId}?new=true`,
      testWith: {
        curl: `curl -X POST http://localhost:3000/api/audit-photos -H "X-Api-Key: ${apiKey}" -H "Content-Type: application/json" -d '{"images":["https://example.com/test.jpg"]}'`
      }
    })

  } catch (error) {
    console.error('[dev/test-key] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
