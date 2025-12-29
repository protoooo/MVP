// Jolt OAuth Connection Endpoint
// GET /api/connect/jolt - Initiates Jolt OAuth flow
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

async function getUserFromAuth(req) {
  if (!supabase) return null
  
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return null
  return user
}

export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    // Verify user is authenticated
    const user = await getUserFromAuth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Pro subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (!subscription || subscription.tier !== 'pro') {
      return NextResponse.json({ 
        error: 'Pro subscription required',
        message: 'Jolt integration requires a Pro tier subscription ($99/mo)'
      }, { status: 403 })
    }

    // Build Jolt OAuth URL
    const joltClientId = process.env.JOLT_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/jolt/callback`
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')

    if (!joltClientId) {
      return NextResponse.json({ 
        error: 'Jolt integration not configured',
        message: 'Contact support to enable Jolt integration'
      }, { status: 503 })
    }

    const joltAuthUrl = `https://api.jolt.com/oauth/authorize?client_id=${joltClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=read:deliveries,read:photos`

    // Redirect to Jolt OAuth
    return NextResponse.redirect(joltAuthUrl)

  } catch (error) {
    console.error('[connect/jolt] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
