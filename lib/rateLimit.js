import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// UPDATED PLAN LIMITS
const LIMITS = {
  free: { text: 10, images: 0 },            // Free trial: 10 queries, no images
  starter: { text: 500, images: 0 },        // Starter: 500 text queries, no images
  pro: { text: 100000, images: 100 },       // Pro: unlimited text, 100 images, has mock audits
  enterprise: { text: 100000, images: 500 } // Enterprise: unlimited, 500 images
}

export async function checkRateLimit(userId) {
  // 1. Get the User's Profile and Subscription
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_subscribed, requests_used, images_used')
    .eq('id', userId)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle()

  // Determine plan
  let planName = 'free'
  if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
    planName = sub.plan || 'pro'
  } else if (profile?.is_subscribed) {
    // Legacy check - if profile says subscribed but no sub record
    planName = 'pro'
  }

  const planLimits = LIMITS[planName] || LIMITS.free
  
  // 2. Check Text Limits
  if (profile.requests_used >= planLimits.text) {
    return { 
      success: false, 
      limitReached: true, 
      message: `${planName === 'free' ? 'Free trial limit' : 'Monthly text query limit'} reached.`,
      plan: planName
    }
  }

  // Return usage data so the Chat Route can check Image limits specifically
  return { 
    success: true, 
    plan: planName,
    imageLimit: planLimits.images,
    currentImages: profile.images_used || 0,
    textUsed: profile.requests_used || 0,
    textLimit: planLimits.text
  }
}
