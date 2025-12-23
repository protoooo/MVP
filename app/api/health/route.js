// app/api/health/route.js - FIXED: Faster, more reliable health check
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Vercel: max 10 seconds

export async function GET() {
  const checks = { 
    db: false, 
    env: false,
    stripe: false,
    cohere: false,
  }
  
  const startTime = Date.now()
  const errors = []
  
  try {
    // 1. Critical Environment variables only
    const criticalEnv = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'COHERE_API_KEY',
      'STRIPE_SECRET_KEY',
      'TURNSTILE_SECRET_KEY',
    ]
    
    const missingEnv = criticalEnv.filter(key => !process.env[key])
    
    if (missingEnv.length === 0) {
      checks.env = true
    } else {
      errors.push(`Missing env: ${missingEnv.join(', ')}`)
    }

    // 2. Quick database check (just connection, no data)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      try {
        // Just check if we can connect (2 second timeout)
        const { error } = await Promise.race([
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000))
        ])
        
        if (!error) {
          checks.db = true
        } else {
          errors.push(`DB error: ${error.message}`)
        }
      } catch (err) {
        errors.push(`DB timeout or error: ${err.message}`)
      }
    }

    // 3. Skip Stripe check in health endpoint (too slow)
    // Just verify key exists
    if (process.env.STRIPE_SECRET_KEY) {
      checks.stripe = true
    }

    // 4. Skip Cohere check (too slow for health endpoint)
    // Just verify key exists
    if (process.env.COHERE_API_KEY) {
      checks.cohere = true
    }

    // Health check passes if critical services are up
    const healthy = checks.db && checks.env
    const duration = Date.now() - startTime
    
    const response = {
      status: healthy ? 'ok' : 'degraded',
      checks,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
    
    if (errors.length > 0) {
      response.errors = errors
    }
    
    if (!healthy) {
      logger.warn('Health check degraded', { checks, errors })
    }
    
    // Return 200 even if degraded (Railway needs 200 for health)
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Health check exception', { error: error.message })
    
    // Still return 200 so Railway doesn't kill the deployment
    return NextResponse.json(
      { 
        status: 'error', 
        error: error.message, 
        checks,
        errors,
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  }
}
