import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CREDENTIALS_JSON',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ]

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
  
  health.checks.environment = {
    status: missingEnvVars.length === 0 ? 'pass' : 'fail',
    missing: missingEnvVars
  }

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .single()

    health.checks.supabase = {
      status: error ? 'fail' : 'pass',
      message: error ? error.message : 'Connected'
    }
  } catch (error) {
    health.checks.supabase = {
      status: 'fail',
      message: error.message
    }
  }

  // Check Google credentials parsing
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    health.checks.google_credentials = {
      status: credentials.project_id ? 'pass' : 'fail',
      project_id: credentials.project_id
    }
  } catch (error) {
    health.checks.google_credentials = {
      status: 'fail',
      message: 'Failed to parse credentials'
    }
  }

  // Overall status
  const allChecks = Object.values(health.checks)
  const hasFailures = allChecks.some(check => check.status === 'fail')
  
  health.status = hasFailures ? 'unhealthy' : 'healthy'
  health.responseTime = Date.now() - startTime

  const statusCode = hasFailures ? 503 : 200

  return NextResponse.json(health, { status: statusCode })
}
