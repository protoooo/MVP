// lib/usage.js
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[usage] Missing SUPABASE envs for admin client')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

// HARD-CODED STRIPE PRICE IDS (you gave these)
const BUSINESS_PRICE_IDS = new Set([
  'price_1ScHSHDlSrKA3nbA35m9RPZW', // Business monthly
  'price_1ScHU8DlSrKA3nbAdep8adQI', // Business yearly
])

const ENTERPRISE_PRICE_IDS = new Set([
  'price_1ScHVADlSrKA3nbAzYsxtZMH', // Enterprise monthly
  'price_1ScHW6DlSrKA3nbAXpWCRFxs', // Enterprise yearly
])

// Per-plan monthly limits (match your pricing modal)
const LIMITS = {
  business: {
    text: 200,
    image: 40,
  },
  enterprise: {
    text: 1000,
    image: 200,
  },
}

/**
 * Throws:
 *  - err.code = 'NO_SUBSCRIPTION'
 *  - err.code = 'SUB_EXPIRED'
 *  - err.code = 'LIMIT_REACHED', err.kind in ['text','image']
 */
export async function checkAndIncrementUsage(userId, { isImage }) {
  if (!userId) {
    const err = new Error('NO_USER')
    err.code = 'NO_USER'
    throw err
  }

  // 1) Look up active subscription for this user
  const { data: sub, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, price_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (subError) {
    console.error('[usage] Sub lookup error', subError)
    throw subError
  }

  const now = new Date()

  if (!sub || !['active', 'trialing'].includes(sub.status)) {
    const err = new Error('NO_SUBSCRIPTION')
    err.code = 'NO_SUBSCRIPTION'
    throw err
  }

  if (!sub.current_period_end || new Date(sub.current_period_end) <= now) {
    const err = new Error('SUB_EXPIRED')
    err.code = 'SUB_EXPIRED'
    throw err
  }

  // 2) Determine plan type from price_id
  let planType = 'business'
  if (sub.price_id && ENTERPRISE_PRICE_IDS.has(sub.price_id)) {
    planType = 'enterprise'
  } else if (sub.price_id && BUSINESS_PRICE_IDS.has(sub.price_id)) {
    planType = 'business'
  }
  // If price_id unknown, default to business limits

  const limits = LIMITS[planType]
  const periodEnd = new Date(sub.current_period_end)

  // Use a rough month window: 1 month back from periodEnd
  const periodStart = new Date(periodEnd)
  periodStart.setMonth(periodEnd.getMonth() - 1)

  // 3) Get most recent usage row
  const { data: usageRow, error: usageError } = await supabaseAdmin
    .from('usage_counters')
    .select('id, text_count, image_count, period_start, period_end, plan_type')
    .eq('user_id', userId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (usageError) {
    console.error('[usage] Usage lookup error', usageError)
    throw usageError
  }

  let current = usageRow

  // If no row, wrong plan, or window expired → create a fresh period
  if (
    !current ||
    current.plan_type !== planType ||
    !current.period_end ||
    new Date(current.period_end) < now
  ) {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('usage_counters')
      .insert({
        user_id: userId,
        plan_type: planType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        text_count: 0,
        image_count: 0,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[usage] Insert error', insertErr)
      throw insertErr
    }
    current = inserted
  }

  // 4) Enforce limit + increment
  const field = isImage ? 'image_count' : 'text_count'
  const limit = isImage ? limits.image : limits.text
  const currentCount = current[field] ?? 0

  if (currentCount + 1 > limit) {
    const err = new Error('PLAN_LIMIT_REACHED')
    err.code = 'LIMIT_REACHED'
    err.kind = isImage ? 'image' : 'text'
    throw err
  }

  const { error: updateErr } = await supabaseAdmin
    .from('usage_counters')
    .update({ [field]: currentCount + 1 })
    .eq('id', current.id)

  if (updateErr) {
    console.error('[usage] Update error', updateErr)
    throw updateErr
  }

  return {
    ok: true,
    planType,
    kind: isImage ? 'image' : 'text',
    used: currentCount + 1,
    remaining: limit - (currentCount + 1),
  }
}
