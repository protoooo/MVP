// API Key Management
// POST /api/keys - Generate new API key (Stripe gated)
// GET /api/keys - List user's API keys  
// DELETE /api/keys?key_id=... - Revoke API key

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
  // Generate a cryptographically secure random API key
  const randomBytes = crypto.randomBytes(32)
  return `plm_${randomBytes.toString('base64url')}`
}

async function getUserFromAuth(req) {
  if (!supabase) return null
  
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return null
  return user
}

// Check if user has active Pro subscription or API-only subscription
async function hasApiAccess(userId) {
  if (!supabase) return false
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, tier')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()
  
  if (error || !data) return false
  
  const now = new Date()
  const endDate = data.current_period_end ? new Date(data.current_period_end) : null
  const isActive = endDate && endDate > now
  
  // Allow if Pro tier or if tier is not set (legacy)
  return isActive && (!data.tier || data.tier === 'pro')
}

// GET - List API keys
export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const user = await getUserFromAuth(req)
    // ✅ BYPASS AUTH for local testing - return empty keys list for anonymous users
    if (!user) {
      console.log('[keys] No user - returning empty list (auth disabled)')
      return NextResponse.json({ keys: [] })
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, key, name, active, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Mask the keys for security (show only last 8 characters)
    const maskedKeys = (keys || []).map(k => ({
      ...k,
      key: `plm_...${k.key.slice(-8)}`
    }))

    return NextResponse.json({ keys: maskedKeys })
  } catch (error) {
    console.error('[keys] GET failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Generate new API key
export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const user = await getUserFromAuth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has API access (Pro subscription)
    const hasAccess = await hasApiAccess(user.id)
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Pro subscription required',
        message: 'You need a Pro subscription to generate API keys. Upgrade to Pro ($99/mo) for API access and native integrations.'
      }, { status: 403 })
    }

    const body = await req.json()
    const { name } = body

    // Generate new API key
    const apiKey = generateApiKey()

    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        id: uuidv4(),
        user_id: user.id,
        key: apiKey,
        name: name || 'Default API Key',
        active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    // Return the full key only once (this is the only time the user will see it)
    return NextResponse.json({ 
      key: data,
      message: 'API key created successfully. Save this key - you won\'t be able to see it again!'
    })
  } catch (error) {
    console.error('[keys] POST failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Revoke API key
export async function DELETE(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const user = await getUserFromAuth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get('key_id')

    if (!keyId) {
      return NextResponse.json({ error: 'key_id parameter required' }, { status: 400 })
    }

    // Set key to inactive (soft delete)
    const { error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', keyId)
      .eq('user_id', user.id) // Ensure user owns this key

    if (error) throw error

    return NextResponse.json({ message: 'API key revoked successfully' })
  } catch (error) {
    console.error('[keys] DELETE failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
