import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  }

  // 1. Check Environment Variables
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
    missing: missingEnvVars,
    redisAvailable: !!process.env.REDIS_URL,
    sentryConfigured: !!process.env.NEXT_PUBLIC_SENTRY_DSN
  }

  // 2. Check Supabase Database Connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const dbStart = Date.now()
    const { error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    health.checks.database = {
      status: error ? 'fail' : 'pass',
      responseTime: Date.now() - dbStart,
      message: error ? error.message : 'Connected',
      recordCount: count || 0
    }
  } catch (error) {
    health.checks.database = {
      status: 'fail',
      message: error.message
    }
  }

  // 3. Check Documents Table (for AI search)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })

    health.checks.documents = {
      status: error ? 'fail' : 'pass',
      message: error ? error.message : 'Documents table accessible',
      documentCount: count || 0
    }
  } catch (error) {
    health.checks.documents = {
      status: 'fail',
      message: error.message
    }
  }

  // 4. Check Google Credentials Parsing
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

  // 5. Check Stripe Configuration
  health.checks.stripe = {
    status: (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) ? 'pass' : 'fail',
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
  }

  // 6. Check Redis Connection (optional but recommended)
  if (process.env.REDIS_URL) {
    try {
      const Redis = (await import('ioredis')).default
      const redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1
      })
      
      const redisStart = Date.now()
      await redis.ping()
      
      health.checks.redis = {
        status: 'pass',
        responseTime: Date.now() - redisStart,
        message: 'Connected'
      }
      
      redis.disconnect()
    } catch (error) {
      health.checks.redis = {
        status: 'warn',
        message: 'Redis unavailable, using fallback rate limiting'
      }
    }
  } else {
    health.checks.redis = {
      status: 'skip',
      message: 'Redis not configured'
    }
  }

  // Determine Overall Status
  const allChecks = Object.values(health.checks)
  const hasCriticalFailures = allChecks.some(
    check => check.status === 'fail' && check !== health.checks.redis
  )
  
  health.status = hasCriticalFailures ? 'unhealthy' : 'healthy'
  health.responseTime = Date.now() - startTime

  const statusCode = hasCriticalFailures ? 503 : 200

  return NextResponse.json(health, { status: statusCode })
}
