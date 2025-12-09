// lib/usage.js
import { createClient } from '@supabase/supabase-js'

// Safety check for env vars
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[usage] Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

// Admin client – service key, no RLS on usage_counters
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

// --- HARD-CODED STRIPE PRICE IDS (from you) ---
// Business: $100
const BUSINESS_PRICE_IDS = [
  'price_1ScHSHDlSrKA3nbA35m9RPZW', // Business monthly
  'price_1ScHU8DlSrKA3nbAdep8adQI', // Business yearly
]

// Enterprise: $200
const ENTERPRISE_PRICE_IDS = [
  'price_1ScHVADlSrKA3nbAzYsxtZMH', // Enterprise monthly
  'price_1ScHW6DlSrKA3nbAXpWCRFxs', // Enterprise yearly
]

// --- LIMITS PER PLAN, PER BILLING PERIOD ---
const PLAN_LIMITS = {
  business: {
    text: 200,  // "Up to ~200 text queries per month"
    image: 40,  // "Up to ~40 image mock audits per month"
  },
  enterprise: {
    text: 1000, // "Up to ~1,000 text queries per month"
    image: 200, // "Up to ~200 image mock audits per month"
  },
}

function mapPriceToPlan(priceId) {
  if (BUSINESS_PRICE_IDS.includes(priceId)) return 'business'
  if (ENTERPRISE_PRICE_IDS.includes(priceId)) return 'enterprise'
  return null
}

async function getActiveSubscription(userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, price_id, current_period_start, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[usage] Subscription lookup error:', error)
    const e = new Error('Subscription lookup failed')
    e.code = 'SUB_LOOKUP_FAILED'
    throw e
  }

  return data || null
}

// Main function the API route calls
export async function checkAndIncrementUsage(userId, { isImage = false } = {}) {
  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  const sub = await getActiveSubscription(userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  const planType = mapPriceToPlan(sub.price_id)

  if (!planType) {
    const e = new Error(`Unknown plan for price_id=${sub.price_id}`)
    e.code = 'UNKNOWN_PLAN'
    throw e
  }

  const limits = PLAN_LIMITS[planType]
  if (!limits) {
    const e = new Error('No limits configured for plan')
    e.code = 'NO_LIMITS'
    throw e
  }

  const periodStart = new Date(sub.current_period_start || sub.current_period_end)
  const periodEnd = new Date(sub.current_period_end || sub.current_period_start)

  // Fetch latest usage row for this user
  const { data: existing, error: usageError } = await supabaseAdmin
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (usageError) {
    console.error('[usage] Usage lookup error:', usageError)
    const e = new Error('Usage lookup failed')
    e.code = 'USAGE_LOOKUP_FAILED'
    throw e
  }

  const inSamePeriod =
    existing &&
    existing.period_start &&
    new Date(existing.period_start) >= periodStart &&
    new Date(existing.period_start) < periodEnd

  let row = existing

  // If no row or we’re in a new billing period, start a fresh counter row
  if (!inSamePeriod) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('usage_counters')
      .insert({
        user_id: userId,
        plan_type: planType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        text_count: 0,
        image_count: 0,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[usage] Failed to insert usage row:', insertError)
      const e = new Error('USAGE_INSERT_FAILED')
      e.code = 'USAGE_INSERT_FAILED'
      throw e
    }

    row = inserted
  }

  const nextTextCount = row.text_count + (isImage ? 0 : 1)
  const nextImageCount = row.image_count + (isImage ? 1 : 0)

  if (!isImage && nextTextCount > limits.text) {
    const e = new Error('Text limit reached')
    e.code = 'LIMIT_REACHED'
    e.kind = 'text'
    throw e
  }

  if (isImage && nextImageCount > limits.image) {
    const e = new Error('Image limit reached')
    e.code = 'LIMIT_REACHED'
    e.kind = 'image'
    throw e
  }

  const { error: updateError } = await supabaseAdmin
    .from('usage_counters')
    .update({
      text_count: nextTextCount,
      image_count: nextImageCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  if (updateError) {
    console.error('[usage] Failed to update usage row:', updateError)
    const e = new Error('USAGE_UPDATE_FAILED')
    e.code = 'USAGE_UPDATE_FAILED'
    throw e
  }

  return {
    planType,
    remainingText: limits.text - nextTextCount,
    remainingImage: limits.image - nextImageCount,
  }
}
