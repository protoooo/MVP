// lib/usage.ts
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('usage.ts: NEXT_PUBLIC_SUPABASE_URL missing')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('usage.ts: SUPABASE_SERVICE_ROLE_KEY missing')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
)

// Map your Stripe price IDs to plans
const BUSINESS_PRICE_IDS = new Set<string>([
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL || '',
])

const ENTERPRISE_PRICE_IDS = new Set<string>([
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || '',
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE_ANNUAL || '',
])

type PlanType = 'business' | 'enterprise'

const LIMITS: Record<PlanType, { text: number; image: number }> = {
  business: {
    // safely "unlimited" for most stores, but still bounded
    text: 600,      // text queries / month
    image: 120,     // image audits / month
  },
  enterprise: {
    text: 3000,     // way more headroom
    image: 600,
  },
}

function inferPlanFromPrice(priceId: string | null, fallbackPlan?: string | null): PlanType {
  if (priceId && ENTERPRISE_PRICE_IDS.has(priceId)) return 'enterprise'
  if (priceId && BUSINESS_PRICE_IDS.has(priceId)) return 'business'

  // if you ever store a "plan" column with 'enterprise' explicitly:
  if (fallbackPlan === 'enterprise') return 'enterprise'
  return 'business'
}

export async function checkAndIncrementUsage(
  userId: string,
  opts: { isImage: boolean }
): Promise<void> {
  const now = new Date()

  // 1) Get active subscription for this user
  const { data: sub, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'status, current_period_start, current_period_end, price_id, plan'
    )
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (subError) {
    console.error('[usage] Error fetching subscription:', subError)
    throw Object.assign(new Error('Subscription lookup failed'), { code: 'SUB_LOOKUP_FAILED' as const })
  }

  if (!sub) {
    throw Object.assign(new Error('No active subscription'), { code: 'NO_SUBSCRIPTION' as const })
  }

  const periodEnd = new Date(sub.current_period_end)
  if (periodEnd.getTime() <= now.getTime()) {
    throw Object.assign(new Error('Subscription expired'), { code: 'SUB_EXPIRED' as const })
  }

  const periodStart = new Date(sub.current_period_start)
  const planType = inferPlanFromPrice(
    (sub as any).price_id || null,
    (sub as any).plan || null
  )

  const limits = LIMITS[planType]
  const kind: 'text' | 'image' = opts.isImage ? 'image' : 'text'

  // 2) Load or create usage row for this billing period
  const { data: existing, error: usageError } = await supabaseAdmin
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', periodStart.toISOString())
    .eq('period_end', periodEnd.toISOString())
    .maybeSingle()

  if (usageError && usageError.code !== 'PGRST116') {
    // PGRST116 = no rows
    console.error('[usage] Error fetching usage row:', usageError)
    throw Object.assign(new Error('Usage lookup failed'), { code: 'USAGE_LOOKUP_FAILED' as const })
  }

  let textCount = existing?.text_count ?? 0
  let imageCount = existing?.image_count ?? 0

  const nextTextCount = kind === 'text' ? textCount + 1 : textCount
  const nextImageCount = kind === 'image' ? imageCount + 1 : imageCount

  if (nextTextCount > limits.text || nextImageCount > limits.image) {
    throw Object.assign(
      new Error('Usage limit reached'),
      {
        code: 'LIMIT_REACHED' as const,
        kind,
      }
    )
  }

  // 3) Upsert new counters
  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from('usage_counters')
      .insert({
        user_id: userId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        plan: planType,
        text_count: nextTextCount,
        image_count: nextImageCount,
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[usage] Insert error:', insertError)
      throw Object.assign(new Error('Usage update failed'), { code: 'USAGE_UPDATE_FAILED' as const })
    }
  } else {
    const { error: updateError } = await supabaseAdmin
      .from('usage_counters')
      .update({
        text_count: nextTextCount,
        image_count: nextImageCount,
        plan: planType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('[usage] Update error:', updateError)
      throw Object.assign(new Error('Usage update failed'), { code: 'USAGE_UPDATE_FAILED' as const })
    }
  }
}
