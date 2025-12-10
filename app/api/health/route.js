import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks = { db: false, env: false }
  
  try {
    // Check env vars
    checks.env = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.OPENAI_API_KEY &&
      process.env.STRIPE_SECRET_KEY
    )

    // Check DB connection
    if (checks.env) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { error } = await supabase.from('feature_flags').select('flag_name').limit(1)
      checks.db = !error
    }

    const healthy = checks.db && checks.env
    return NextResponse.json(
      { status: healthy ? 'ok' : 'degraded', checks },
      { status: healthy ? 200 : 503 }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error.message, checks },
      { status: 503 }
    )
  }
}
