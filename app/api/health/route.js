import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = { 
    db: false, 
    env: false,
    stripe: false,
    openai: false 
  }
  
  const startTime = Date.now()
  
  try {
    // Check environment variables
    checks.env = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.OPENAI_API_KEY &&
      process.env.STRIPE_SECRET_KEY
    )

    // Check Stripe connection
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        await stripe.balance.retrieve()
        checks.stripe = true
      } catch (err) {
        console.error('[Health] Stripe check failed:', err.message)
      }
    }

    // Check OpenAI connection (lightweight)
    if (process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        // Just verify the client can be instantiated
        checks.openai = !!openai
      } catch (err) {
        console.error('[Health] OpenAI check failed:', err.message)
      }
    }

    // Check database connection
    if (checks.env) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { error } = await supabase
        .from('feature_flags')
        .select('flag_name')
        .limit(1)
      
      checks.db = !error
      
      if (error) {
        console.error('[Health] DB check failed:', error.message)
      }
    }

    const healthy = checks.db && checks.env && checks.stripe && checks.openai
    const duration = Date.now() - startTime
    
    return NextResponse.json(
      { 
        status: healthy ? 'ok' : 'degraded', 
        checks,
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: healthy ? 200 : 503 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    
    return NextResponse.json(
      { 
        status: 'error', 
        error: error.message, 
        checks,
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
