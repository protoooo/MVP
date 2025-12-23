// lib/usage.js - SECURE TRIAL VERIFICATION (NO BYPASS)
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Cache schema lookups so we don't hammer tables on every request
let usageCountersSchema = null
let usageEventsTableExists = null

async function ensureUsageCountersSchema(supabaseAdmin) {
  if (usageCountersSchema) return usageCountersSchema

  try {
    // ✅ FIXED: Test table by querying it instead of information_schema
    const { error } = await supabaseAdmin
      .from('usage_counters')
      .select('id')
      .limit(0)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows (table exists but empty)
      logger.warn('usage_counters table not accessible', { error: error.message })
      usageCountersSchema = { exists: false }
      return usageCountersSchema
    }

    // Assume modern schema with all columns if table exists
    usageCountersSchema = {
      exists: true,
      hasLastDuration: true,
      hasLastMode: true,
      hasLastSuccess: true,
    }

    logger.info('Usage counters schema loaded')
  } catch (err) {
    logger.warn('Usage counters schema check failed', { error: err?.message })
    usageCountersSchema = { exists: false }
  }

  return usageCountersSchema
}

async function ensureUsageEventsTable(supabaseAdmin) {
  if (usageEventsTableExists !== null) return usageEventsTableExists

  try {
    // ✅ FIXED: Test table by querying it instead of information_schema
    const { error } = await supabaseAdmin
      .from('usage_events')
      .select('id')
      .limit(0)

    if (error && error.code !== 'PGRST116') {
      logger.warn('usage_events table not accessible')
      usageEventsTableExists = false
      return usageEventsTableExists
    }

    usageEventsTableExists = true
    logger.info('Usage events table available')
    return usageEventsTableExists
  } catch (err) {
    logger.warn('Usage events table check failed', { error: err?.message })
    usageEventsTableExists = false
    return usageEventsTableExists
  }
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    const e = new Error('Missing Supabase admin env vars')
    e.code = 'MISSING_SUPABASE_ADMIN_ENV'
    throw e
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

function safeDate(value, fallback) {
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : fallback
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

async function getActiveSubscription(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, price_id, current_period_start, current_period_end, trial_end, plan, stripe_subscription_id, cancel_at_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('Subscription lookup failed', {
      error: error.message,
      userId,
    })
    const e = new Error('Subscription lookup failed')
    e.code = 'SUB_LOOKUP_FAILED'
    throw e
  }

  return data || null
}

/**
 * ✅ SECURE: Zero tolerance for expired trials without payment
 */
async function verifyTrialExpiration(sub, userId) {
  if (sub.status !== 'trialing' || !sub.trial_end) {
    return { valid: true, subscription: sub }
  }

  const trialEnd = new Date(sub.trial_end)
  const now = new Date()
  
  // ✅ Trial still active
  if (trialEnd >= now) {
    const hoursLeft = Math.round((trialEnd - now) / (1000 * 60 * 60))
    
    // Warn if ending soon without payment method
    if (!sub.stripe_subscription_id && hoursLeft <= 24) {
      logger.warn('Trial ending soon without payment method', { userId, hoursLeft })
    }
    
    return { valid: true, subscription: sub }
  }
  
  // ============================================================================
  // ❌ TRIAL HAS EXPIRED - ZERO TOLERANCE
  // ============================================================================
  
  // No Stripe subscription = Deny immediately
  if (!sub.stripe_subscription_id) {
    logger.security('Trial expired without Stripe subscription', { 
      userId,
      hoursSinceExpiry: Math.round((now - trialEnd) / (1000 * 60 * 60))
    })
    const e = new Error('Your trial has ended. Please subscribe to continue.')
    e.code = 'TRIAL_EXPIRED'
    throw e
  }
  
  // Verify with Stripe (fail-closed)
  let stripeSubscription
  try {
    stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
  } catch (stripeError) {
    logger.error('Stripe verification failed during trial check', {
      error: stripeError.message,
      userId
    })
    
    // If Stripe is down, deny access (fail-closed)
    const e = new Error('Unable to verify subscription. Please try again.')
    e.code = 'TRIAL_EXPIRED_VERIFICATION_FAILED'
    throw e
  }
  
  // Check if conversion succeeded
  if (stripeSubscription.status === 'active') {
    logger.info('Trial converted to active subscription', { userId })
    return { valid: true, subscription: sub }
  }
  
  // ✅ FIXED: NO grace period - deny immediately if not active
  logger.security('Trial expired - payment not completed', { 
    userId, 
    stripeStatus: stripeSubscription.status,
    trialEnd: trialEnd.toISOString()
  })
  
  const e = new Error('Your trial has ended. Please complete payment to continue.')
  e.code = 'TRIAL_EXPIRED_PAYMENT_REQUIRED'
  throw e
}

export async function checkAccess(userId) {
  if (!userId) {
    const e = new Error('No user ID provided')
    e.code = 'NO_USER'
    throw e
  }

  const supabaseAdmin = getSupabaseAdmin()
  const sub = await getActiveSubscription(supabaseAdmin, userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  const trialCheck = await verifyTrialExpiration(sub, userId)
  if (!trialCheck.valid) {
    throw new Error(trialCheck.error || 'Trial verification failed')
  }

  // Check paid subscription expiration (24hr grace for billing issues only)
  if (sub.status === 'active' && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      const graceHours = 24
      const gracePeriodEnd = new Date(periodEnd.getTime() + graceHours * 60 * 60 * 1000)
      
      if (now > gracePeriodEnd) {
        logger.security('Subscription expired beyond grace period', { 
          userId, 
          hoursSinceExpiry: Math.round((now - periodEnd) / (1000 * 60 * 60))
        })
        const e = new Error('Your subscription has expired. Please update payment.')
        e.code = 'SUBSCRIPTION_EXPIRED'
        throw e
      }
      
      logger.warn('Subscription in grace period (billing issue)', { 
        userId,
        hoursRemaining: Math.round((gracePeriodEnd - now) / (1000 * 60 * 60))
      })
    }
  }

  return { valid: true, subscription: sub }
}

export async function logUsageForAnalytics(payload) {
  const { userId, mode, success, durationMs } = payload || {}

  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  const isImage = mode === 'vision'
  const supabaseAdmin = getSupabaseAdmin()

  const schema = await ensureUsageCountersSchema(supabaseAdmin)
  if (!schema?.exists) {
    return { success: true, planType: 'unlimited', unlimited: true }
  }

  const sub = await getActiveSubscription(supabaseAdmin, userId)
  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  await verifyTrialExpiration(sub, userId)

  const planName = 'unlimited'
  const now = new Date()
  let periodStart = safeDate(sub.current_period_start, safeDate(sub.current_period_end, now))
  let periodEnd = safeDate(sub.current_period_end, addDays(periodStart, 30))

  if (!Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) {
    periodEnd = addDays(periodStart, 30)
  }

  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  try {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('usage_counters')
      .select('id, user_id, period_start, period_end, text_count, image_count, plan')
      .eq('user_id', userId)
      .gte('period_start', periodStartISO)
      .lt('period_start', periodEndISO)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingErr) {
      logger.error('Usage lookup failed', { error: existingErr.message, userId })
    }

    let row = existing

    if (!row) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
          plan: planName,
          plan_type: 'unlimited',
          period_start: periodStartISO,
          period_end: periodEndISO,
          text_count: 0,
          image_count: 0,
        })
        .select('id, text_count, image_count, plan')
        .single()

      if (insertErr) {
        logger.error('Usage insert failed', { error: insertErr.message, userId })
        return { success: true, planType: planName, unlimited: true }
      }

      row = inserted
    }

    const nextTextCount = (row.text_count || 0) + (isImage ? 0 : 1)
    const nextImageCount = (row.image_count || 0) + (isImage ? 1 : 0)

    const updatePayload = {
      text_count: nextTextCount,
      image_count: nextImageCount,
      updated_at: new Date().toISOString(),
    }

    if (schema.hasLastMode) updatePayload.last_mode = isImage ? 'vision' : 'text'
    if (schema.hasLastSuccess) updatePayload.last_success = typeof success === 'boolean' ? success : null
    if (schema.hasLastDuration) updatePayload.last_duration_ms = Number.isFinite(durationMs) ? Math.round(durationMs) : null

    const { error: updateErr } = await supabaseAdmin.from('usage_counters').update(updatePayload).eq('id', row.id)

    if (updateErr) {
      logger.error('Usage update failed', { error: updateErr.message, userId })
      return { success: true, planType: planName, unlimited: true }
    }

    logger.info('Usage logged', {
      userId,
      type: isImage ? 'image' : 'text',
      textCount: nextTextCount,
      imageCount: nextImageCount,
    })

    return {
      success: true,
      planType: planName,
      unlimited: true,
      textCount: nextTextCount,
      photoCount: nextImageCount,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
    }
  } catch (err) {
    if (err?.code === 'NO_SUBSCRIPTION' || err?.code?.startsWith('TRIAL_EXPIRED') || err?.code === 'SUBSCRIPTION_EXPIRED') {
      throw err
    }

    logger.error('Usage logging exception', {
      error: err?.message || String(err),
      userId,
    })

    return { success: true, planType: planName, unlimited: true }
  }
}

export async function logModelUsageDetail(event) {
  const {
    userId,
    provider = 'cohere',
    model,
    mode,
    inputTokens,
    outputTokens,
    billedInputTokens,
    billedOutputTokens,
    rerankUsed,
    rerankCandidates,
  } = event || {}

  if (!userId) return { logged: false, reason: 'missing_user' }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const usageEventsAvailable = await ensureUsageEventsTable(supabaseAdmin)
    if (!usageEventsAvailable) return { logged: false, reason: 'usage_events_missing' }

    const { error } = await supabaseAdmin.from('usage_events').insert({
      user_id: userId,
      provider,
      model,
      mode,
      input_tokens: Number.isFinite(inputTokens) ? inputTokens : null,
      output_tokens: Number.isFinite(outputTokens) ? outputTokens : null,
      billed_input_tokens: Number.isFinite(billedInputTokens) ? billedInputTokens : null,
      billed_output_tokens: Number.isFinite(billedOutputTokens) ? billedOutputTokens : null,
      rerank_used: Boolean(rerankUsed),
      rerank_candidates: Number.isFinite(rerankCandidates) ? rerankCandidates : null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      logger.warn('Usage event insert failed', { error: error.message })
      return { logged: false, reason: error.message }
    }

    return { logged: true }
  } catch (err) {
    logger.warn('Usage event logging failed', { error: err?.message })
    return { logged: false, reason: err?.message }
  }
}
