import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ✅ UPDATED: Use Infinity for unlimited plans
const LIMITS = {
  free: { 
    text: 10, 
    images: 0,
    description: 'Free Trial'
  },
  protocollm: { 
    text: Infinity,
    images: Infinity,
    description: 'protocolLM Plan'
  }
}

export async function checkRateLimit(userId) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('requests_used, images_used, is_subscribed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Rate limit check failed - profile not found:', profileError)
      return { 
        success: false, 
        message: 'Account error. Please contact support.' 
      }
    }

    console.log('📊 Profile data:', {
      userId: userId.substring(0, 8),
      requests_used: profile.requests_used,
      images_used: profile.images_used,
      is_subscribed: profile.is_subscribed
    })

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    let planName = 'free'
    let isActive = false
    
    if (sub && !subError) {
      const periodEnd = new Date(sub.current_period_end)
      const now = new Date()
      
      if (periodEnd < now) {
        console.log('⚠️ Subscription expired for user:', userId.substring(0, 8))
        planName = 'free'
