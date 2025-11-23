import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_BASE_URL'
  ]

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
  health.checks.environment = {
    status: missingEnvVars.length === 0 ? 'pass' : 'fail',
    missing: missingEnvVars
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
    health.checks.database = { status: error ? 'fail' : 'pass' }
  } catch (error) {
    health.checks.database = { status: 'fail', message: error.message }
  }

  health.status = Object.values(health.checks).some(c => c.status === 'fail') ? 'unhealthy' : 'healthy'
  const statusCode = health.status === 'unhealthy' ? 503 : 200

  return NextResponse.json(health, { status: statusCode })
}
