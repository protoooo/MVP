import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emails } from '@/lib/emails'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'CHANGE_THIS_IN_PRODUCTION'

async function getUserEmail(userId) {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch (error) {
    return null
  }
}

export async function GET(request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (token !== CRON_SECRET) {
    logger.security('Unauthorized cron attempt', { 
      hasAuth: !!authHeader,
      ip: request.headers.get('x-forwarded-for') 
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.info('🔔 Starting trial reminders cron job')
  
  const now = new Date()
  let emailsSent = 0
  const results = { day3: 0, day5: 0, day7: 0 }
  
  try {
    // ========================================================================
    // DAY 3 REMINDERS (Trial midpoint - 4 days remaining)
    // ========================================================================
    const day3Start = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
    const day3End = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    
    const { data: day3Trials } = await supabase
      .from('subscriptions')
      .select('user_id, trial_end')
      .eq('status', 'trialing')
      .gte('trial_end', day3Start.toISOString())
      .lt('trial_end', day3End.toISOString())
    
    logger.info(`Found ${day3Trials?.length || 0} day-3 reminders`)
    
    for (const trial of day3Trials || []) {
      const userEmail = await getUserEmail(trial.user_id)
      if (userEmail) {
        const userName = userEmail.split('@')[0]
        await emails.trialMidpoint(userEmail, userName)
        results.day3++
        emailsSent++
        logger.info('Sent day-3 reminder', { email: userEmail.substring(0, 3) + '***' })
        await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
      }
    }
    
    // ========================================================================
    // DAY 5 REMINDERS (Trial ending soon - 2 days remaining)
    // ========================================================================
    const day5Start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const day5End = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    const { data: day5Trials } = await supabase
      .from('subscriptions')
      .select('user_id, trial_end')
      .eq('status', 'trialing')
      .gte('trial_end', day5Start.toISOString())
      .lt('trial_end', day5End.toISOString())
    
    logger.info(`Found ${day5Trials?.length || 0} day-5 reminders`)
    
    for (const trial of day5Trials || []) {
      const userEmail = await getUserEmail(trial.user_id)
      if (userEmail) {
        const userName = userEmail.split('@')[0]
        await emails.trialEndingSoon(userEmail, userName, 2)
        results.day5++
        emailsSent++
        logger.info('Sent day-5 reminder', { email: userEmail.substring(0, 3) + '***' })
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // ========================================================================
    // DAY 7 REMINDERS (Trial ends today - last chance)
    // ========================================================================
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const todayEnd = new Date(now.setHours(23, 59, 59, 999))
    
    const { data: day7Trials } = await supabase
      .from('subscriptions')
      .select('user_id, trial_end')
      .eq('status', 'trialing')
      .gte('trial_end', todayStart.toISOString())
      .lt('trial_end', todayEnd.toISOString())
    
    logger.info(`Found ${day7Trials?.length || 0} day-7 reminders`)
    
    for (const trial of day7Trials || []) {
      const userEmail = await getUserEmail(trial.user_id)
      if (userEmail) {
        const userName = userEmail.split('@')[0]
        await emails.trialEndingSoon(userEmail, userName, 0)
        results.day7++
        emailsSent++
        logger.info('Sent day-7 reminder', { email: userEmail.substring(0, 3) + '***' })
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    logger.info('✅ Trial reminders complete', { 
      totalEmails: emailsSent,
      breakdown: results 
    })
    
    return NextResponse.json({ 
      success: true, 
      emailsSent,
      breakdown: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Cron job failed', { error: error.message })
    return NextResponse.json({ 
      error: error.message,
      emailsSent: emailsSent || 0
    }, { status: 500 })
  }
}

// Also support POST for testing
export async function POST(request) {
  return GET(request)
}
