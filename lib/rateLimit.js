import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

export async function checkRateLimit(userId, type = 'text') {
  try {
    // ✅ SECURITY FIX: Server-side only admin check
    const { data: adminCheck } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()
    
    // Check against server-side environment variable only
    if (adminCheck?.email === process.env.ADMIN_EMAIL) {
      console.log('🔑 Admin access granted')
      return { 
        success: true, 
        plan: 'admin',
        currentRequests: 0,
        currentImages: 0,
        requestLimit: Infinity,
        imageLimit: Infinity
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('requests_used, images_used, is_subscribed')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return { 
        success: false, 
        message: 'Account error. Please contact support.' 
      }
    }

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    let planName = 'free'
    
    if (sub && !subError && sub.current_period_end) {
      const periodEnd = new Date(sub.current_period_end)
      const now = new Date()
      
      if (periodEnd >= now) {
        planName = sub.plan || 'protocollm'
      }
    }

    const limits = LIMITS[planName] || LIMITS.free
    const used = type === 'image' ? (profile.images_used || 0) : (profile.requests_used || 0)
    const limit = type === 'image' ? limits.images : limits.text

    if (used >= limit) {
      return {
        success: false,
        message: planName === 'free' 
          ? 'Free trial limit reached. Subscribe for unlimited access.' 
          : 'Usage limit reached.',
        limitReached: true
      }
    }

    return { 
      success: true, 
      plan: planName,
      currentRequests: profile.requests_used || 0,
      currentImages: profile.images_used || 0,
      requestLimit: limits.text,
      imageLimit: limits.images
    }

  } catch (error) {
    console.error('❌ Rate limit check error:', error)
    return { success: false, message: 'System error. Please try again.' }
  }
}

export async function incrementUsage(userId, type = 'text') {
  try {
    const column = type === 'image' ? 'images_used' : 'requests_used'
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(column)
      .eq('id', userId)
      .single()

    if (profile) {
      const currentCount = profile[column] || 0
      await supabase
        .from('user_profiles')
        .update({ [column]: currentCount + 1 })
        .eq('id', userId)
    }
  } catch (error) {
    console.error('❌ Increment usage error:', error)
  }
}
