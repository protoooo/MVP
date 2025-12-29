// Admin API route to manage all API keys
// GET /api/admin/api-keys - List all keys
// POST /api/admin/api-keys - Create test key
// Requires X-Admin-Secret header
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

function generateApiKey() {
  return `sk_${crypto.randomBytes(32).toString('hex')}`
}

function checkAdminAuth(req) {
  const adminSecret = req.headers.get('x-admin-secret')
  if (!ADMIN_SECRET || !adminSecret || adminSecret !== ADMIN_SECRET) {
    return false
  }
  return true
}

// GET - List all API keys (admin only)
export async function GET(req) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized - Invalid admin secret' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: keys, error, count } = await supabase
      .from('api_keys')
      .select('id, customer_email, remaining_credits, total_credits, total_used, tier, active, created_at, expires, last_used_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      keys: keys || [],
      total: count,
      limit,
      offset
    })

  } catch (error) {
    console.error('[admin/api-keys] GET failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create test API key (admin only)
export async function POST(req) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized - Invalid admin secret' }, { status: 401 })
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { 
      credits = 1000, 
      tier = 'test',
      customerEmail = 'admin@test.local',
      expiresInDays = 365
    } = body

    const apiKey = generateApiKey()
    const keyId = uuidv4()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

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

    console.log(`[admin/api-keys] Created test API key for ${customerEmail}`)

    return NextResponse.json({
      success: true,
      keyId,
      apiKey, // Return full key for admin
      credits,
      tier,
      expires: expiresAt.toISOString(),
      dashboardUrl: `/dashboard/${keyId}?new=true`
    })

  } catch (error) {
    console.error('[admin/api-keys] POST failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
