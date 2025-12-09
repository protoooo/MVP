// lib/usage.js
//
// Enforces per-plan usage limits for text vs image queries.
// Called from /api/chat/route.js via `checkAndIncrementUsage(user.id, { isImage })`.
//
// Plans:
//  - "business"   → $100
//  - "enterprise" → $200
//
// If the plan string is missing or unrecognized, we treat it as "business" by default.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

// ---- PLAN LIMITS ----
// You asked me to pick the limits; here’s a conservative but meaningful setup.
// You can tweak these numbers any time.
const PLAN_LIMITS = {
  business: {
    // Per billing period (based on Stripe subscription period_start/end)
    text: 200,   // 200 text Qs / month
    image: 60,   // 60 image audits / month
  },
  enterprise: {
    text: 1000,  // 1,000 text Qs / month
    image: 240,  // 240 image audits / month
  },
}

// Normalize whatever is stored in subscriptions.plan → our keys above
function normalizePlan(planRaw) {
  const plan = (planRaw || '').toLowerCase()

  if (!plan || plan === 'protocollm' || plan === 'pro') {
    return 'business'
  }

  if (plan.includes('enterprise')) return 'enterprise'
  if (plan.includes('business')) return 'business'

  // Fallback: treat unknown as business
  return 'business'
}

function makeError(code, message, extra = {}) {
  const err = new Error(message)
  err.code = code
  Object.assign(err, extra)
  return err
}

// Fetch the active subscription record for this user (if any)
async function getActiveSubscription(userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'id, stripe_subscription_id, plan, status, current_period_start, current_period_end'
    )
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[usage] Failed to load subscription:', error)
    throw makeError('SUB_LOOKUP_FAIL', 'Failed to load subscription')
  }

  if (!data) {
    throw makeError('NO_SUBSCRIPTION', 'No active subscription')
  }

  const now = new Date()
  const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null

  if (
    !['active', 'trialing'].includes(data.status) ||
    (periodEnd && periodEnd < now)
  ) {
    throw makeError('SUB_EXPIRED', 'Subscription expired or inactive')
  }

  return data
}

// Main function: enforce limits + increment usage
export async function checkAndIncrementUsage(userId, { isImage = false } = {}) {
  if (!userId) {
    throw makeError('NO_SUBSCRIPTION', 'User ID missing for usage check')
  }

  // 1) Get active subscription
  const sub = await getActiveSubscription(userId)
  const planKey = normalizePlan(sub.plan)
  const limits = PLAN_LIMITS[planKey]

  // If somehow no limits defined, treat as unlimited (safest for user)
  if (!limits) {
    console.warn('[usage] No PLAN_LIMITS entry for plan:', planKey)
    return { ok: true, kind: isImage ? 'image' : 'text', unlimited: true }
  }

  const kind = isImage ? 'image' : 'text'
  const limitForKind = limits[kind]

  // 2) Look up existing usage record for (user, subscription, billing period)
  const periodStart = sub.current_period_start
  const periodEnd = sub.current_period_end

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('usage_counters')
    .select('id, text_used, image_used')
    .eq('user_id', userId)
    .eq('subscription_id', sub.stripe_subscription_id)
    .eq('period_start', periodStart)
    .maybeSingle()

  if (existingError) {
    console.error('[usage] Failed to load usage row:', existingError)
    throw makeError('USAGE_LOOKUP_FAIL', 'Failed to check usage')
  }

  const currentText = existing?.text_used ?? 0
  const currentImage = existing?.image_used ?? 0

  const newText = currentText + (isImage ? 0 : 1)
  const newImage = currentImage + (isImage ? 1 : 0)

  const projectedUsage = isImage ? newImage : newText

  // 3) Enforce limit
  if (projectedUsage > limitForKind) {
    throw makeError('LIMIT_REACHED', 'Usage limit reached', { kind })
  }

  // 4) Upsert the usage row (increment)
  const { error: upsertError } = await supabaseAdmin
    .from('usage_counters')
    .upsert(
      {
        id: existing?.id, // if present, update; if not, insert
        user_id: userId,
        subscription_id: sub.stripe_subscription_id,
        plan: planKey,
        period_start: periodStart,
        period_end: periodEnd,
        text_used: newText,
        image_used: newImage,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,subscription_id,period_start',
      }
    )

  if (upsertError) {
    console.error('[usage] Failed to upsert usage row:', upsertError)
    throw makeError('USAGE_UPDATE_FAIL', 'Failed to update usage')
  }

  return {
    ok: true,
    kind,
    remaining: limitForKind - projectedUsage,
    limit: limitForKind,
    plan: planKey,
  }
}
