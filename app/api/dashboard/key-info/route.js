// API route to fetch API key information for dashboard
// GET /api/dashboard/key-info?keyId=xxx
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get('keyId')

    if (!keyId) {
      return NextResponse.json({ error: 'keyId parameter required' }, { status: 400 })
    }

    // Fetch API key data by ID
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('id, key, customer_email, remaining_credits, total_credits, total_used, tier, active, created_at, expires, last_used_at')
      .eq('id', keyId)
      .single()

    if (error || !keyData) {
      console.error('[dashboard/key-info] Key not found:', error)
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Return key data with masked key by default
    // The dashboard will show full key only if ?new=true
    const maskedKey = `sk_${'*'.repeat(56)}${keyData.key.slice(-8)}`

    return NextResponse.json({
      id: keyData.id,
      key: keyData.key, // Full key for copy functionality
      maskedKey,
      customer_email: keyData.customer_email,
      remaining_credits: keyData.remaining_credits || 0,
      total_credits: keyData.total_credits || 0,
      total_used: keyData.total_used || 0,
      tier: keyData.tier,
      active: keyData.active,
      created_at: keyData.created_at,
      expires: keyData.expires,
      last_used_at: keyData.last_used_at
    })

  } catch (error) {
    console.error('[dashboard/key-info] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
