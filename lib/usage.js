// lib/usage.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn(
    '[usage] Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  )
}

// Admin client (server-side only)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Per-plan monthly limits
// You can tweak these numbers to match your pricing card.
const PLAN_LIMITS = {
  business: {
    textPerMonth: 200, // "Up to ~200 text queries"
    imagePerMonth: 40, // "Up to ~40 image mock audits"
  },
  enterprise: {
    textPerMonth: 1000, // "Up to ~1,000 text queries"
    imagePerMonth: 200, // "Up to ~200 image audits"
  },
}

function normalizePlan(planType) {
  const key = (planType || 'business').toLowerCase()
  return PLAN_LIMITS[key] ? key : 'business'
}

function getCurrentPeriod() {
  const now = new Date()
  // Monthly period: first of this month to first of next month (UTC)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { start, end }
}

/**
 * checkAndIncrementUsage
 *
 * - userId: Supabase auth user id (uuid)
 * - options:
 *    - isImage: boolean (true = image audit, false = text query)
 *    - planType: "business" | "enterprise" (we normalize to business by default)
 *
 * Throws:
 *   - err.code === 'LIMIT_REACHED', err.kind === 'text' | 'image'
 *   - generic Error('DB_ERROR') if Supabase fails
 */
export async function checkAndIncrementUsage(
  userId,
  { isImage = false, planType = 'business' } = {}
) {
  if (!userId) {
    const err = new Error('Missing user id for usage tracking')
    err.code = 'NO_USER'
    throw err
  }

  const planKey = normalizePlan(planType)
  const limits = PLAN_LIMITS[planKey]
  const { start, end } = getCurrentPeriod()

  // Load (or not) existing counter row for this user+plan+period
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_type', planKey)
    .gte('period_start', start.toISOString())
    .lt('period_end', end.toISOString())
    .maybeSingle()

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('[usage] Select error:', selectError)
    const err = new Error('DB_ERROR')
    err.code = 'DB_ERROR'
    throw err
  }

  let textCount = existing?.text_count ?? 0
  let imageCount = existing?.image_count ?? 0

  // Check limits BEFORE increment
  if (isImage) {
    if (imageCount >= limits.imagePerMonth) {
      const err = new Error('Image limit reached for this billing period')
      err.code = 'LIMIT_REACHED'
      err.kind = 'image'
      throw err
    }
    imageCount += 1
  } else {
    if (textCount >= limits.textPerMonth) {
      const err = new Error('Text limit reached for this billing period')
      err.code = 'LIMIT_REACHED'
      err.kind = 'text'
      throw err
    }
    textCount += 1
  }

  const nowIso = new Date().toISOString()

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('usage_counters')
      .update({
        text_count: textCount,
        image_count: imageCount,
        updated_at: nowIso,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('[usage] Update error:', updateError)
      const err = new Error('DB_ERROR')
      err.code = 'DB_ERROR'
      throw err
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from('usage_counters').insert({
      user_id: userId,
      plan_type: planKey,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      text_count: textCount,
      image_count: imageCount,
      created_at: nowIso,
      updated_at: nowIso,
    })

    if (insertError) {
      console.error('[usage] Insert error:', insertError)
      const err = new Error('DB_ERROR')
      err.code = 'DB_ERROR'
      throw err
    }
  }

  return {
    ok: true,
    plan: planKey,
    textCount,
    imageCount,
    limits,
  }
}

export function getPlanLimits(planType = 'business') {
  const key = normalizePlan(planType)
  return PLAN_LIMITS[key]
}
