// Jolt OAuth Callback Handler
// POST /api/jolt/callback - Receives OAuth code and stores access token
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
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      // OAuth error - redirect to dashboard with error
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?integration=jolt&status=error&message=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing OAuth parameters' }, { status: 400 })
    }

    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const userId = stateData.userId

    if (!userId) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
    }

    // Exchange code for access token
    const joltClientId = process.env.JOLT_CLIENT_ID
    const joltClientSecret = process.env.JOLT_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/jolt/callback`

    const tokenResponse = await fetch('https://api.jolt.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: joltClientId,
        client_secret: joltClientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[jolt/callback] Token exchange failed:', errorData)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?integration=jolt&status=error&message=${encodeURIComponent('Failed to connect to Jolt')}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Store in Supabase integrations table
    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        integration_type: 'jolt',
        access_token,
        refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        status: 'connected',
        last_sync_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,integration_type'
      })

    if (upsertError) {
      console.error('[jolt/callback] Failed to store token:', upsertError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?integration=jolt&status=error&message=${encodeURIComponent('Failed to save integration')}`)
    }

    // Success - redirect to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?integration=jolt&status=success&message=${encodeURIComponent('Jolt connected successfully!')}`)

  } catch (error) {
    console.error('[jolt/callback] Error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?integration=jolt&status=error&message=${encodeURIComponent('An error occurred')}`)
  }
}
