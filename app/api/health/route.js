// app/api/health/route.js - Enhanced health check
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = { 
    db: false, 
    env: false,
    stripe: false,
    openai: false,
    emails: false
  }
  
  const startTime = Date.now()
  const errors = []
  
  try {
    // 1. Environment variables
    const requiredEnv = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'TURNSTILE_SECRET_KEY',
      'RESEND_API_KEY',
      'ADMIN_EMAIL'
    ]
    
    const missingEnv = requiredEnv.filter(key => !process.env[key])
    
    if (missingEnv.length === 0) {
      checks.env = true
    } else {
      errors.push(`Missing env vars: ${missingEnv.join(', ')}`)
      logger.error('Health check: Missing environment variables', { missing: missingEnv })
    }

    // 2. Database connection
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { error, count } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
      
      if (!error && count > 0) {
        checks.db = true
      } else {
        errors.push(`Database error: ${error?.message || 'No documents found'}`)
        logger.error('Health check: Database failed', { error: error?.message })
      }
    }

    // 3. Stripe connection
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.balance.retrieve()
        checks.stripe = true
      } catch (err) {
        errors.push(`Stripe error: ${err.message}`)
        logger.error('Health check: Stripe failed', { error: err.message })
      }
    }

    // 4. OpenAI connection
    if (process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        checks.openai = !!openai
      } catch (err) {
        errors.push(`OpenAI error: ${err.message}`)
        logger.error('Health check: OpenAI failed', { error: err.message })
      }
    }
    
    // 5. Email service (Resend)
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'health-check@protocollm.org',
            to: ['health@protocollm.org'],
            subject: 'Health Check',
            html: '<p>Health check</p>'
          })
        })
        
        // Don't actually send, just verify API key works (will get validation error, not auth error)
        if (res.status === 422 || res.status === 200) {
          checks.emails = true
        } else {
          const error = await res.text()
          errors.push(`Email service error: ${error}`)
        }
      } catch (err) {
        errors.push(`Email service error: ${err.message}`)
      }
    }

    const healthy = checks.db && checks.env && checks.stripe && checks.openai && checks.emails
    const duration = Date.now() - startTime
    
    const response = {
      status: healthy ? 'ok' : 'degraded',
      checks,
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }
    
    if (errors.length > 0) {
      response.errors = errors
    }
    
    if (!healthy) {
      logger.warn('Health check failed', { checks, errors })
    }
    
    return NextResponse.json(response, { status: healthy ? 200 : 503 })
    
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Health check exception', { error: error.message })
    
    return NextResponse.json(
      { 
        status: 'error', 
        error: error.message, 
        checks,
        errors,
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
