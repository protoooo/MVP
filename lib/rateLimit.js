import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// DEFINE YOUR PLANS HERE
const LIMITS = {
  starter: { text: 100, images: 0 },        // $29 Plan
  pro: { text: 100000, images: 50 },        // $49 Plan (Unlimited Text)
  enterprise: { text: 100000, images: 500 } // $99 Plan
}

export async function checkRateLimit(userId) {
  // 1. Get the User's Plan
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  // Allow trialing or active users. If no sub, block.
  if (subError || !sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
    return { success: false, error: 'No active subscription found.' }
  }

  // 2. Get User's Usage for this month
  const { data: usage } = await supabase
    .from('user_profiles')
    .select('requests_used, images_used')
    .eq('id', userId)
    .single()

  // Default to starter limits if plan name is weird
  const planLimits = LIMITS[sub.plan] || LIMITS.starter
  
  // 3. Check Text Limits
  if (usage.requests_used >= planLimits.text) {
    return { 
      success: false, 
      limitReached: true, 
      message: 'Monthly text query limit reached.' 
    }
  }

  // Return usage data so the Chat Route can check Image limits specifically
  return { 
    success: true, 
    plan: sub.plan,
    imageLimit: planLimits.images,
    currentImages: usage.images_used
  }
}
