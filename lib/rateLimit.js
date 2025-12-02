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

// ✅ SECURITY FIX: Moved admin bypass to server-side only
export async function checkRateLimit(userId, type = 'text') {
  try {
    // SERVER-SIDE ADMIN BYPASS (not exposed to client)
    if (process.env.ADMIN_USER_EMAIL && userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (profile?.email === process.env.ADMIN_USER_EMAIL) {
        console.log('🔑 Admin bypass activated for:', profile.email)
        return { 
          success: true, 
          plan: 'admin',
          usage: 0,
          limit: Infinity,
          currentRequests: 0,
          currentImages: 0,
          requestLimit: Infinity,
          imageLimit: Infinity
        }
      }
    }

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
        isActive = false
      } else {
        console.log('✅ Active subscription found:', sub.plan)
        planName = sub.plan || 'protocollm'
        isActive = true
      }
    } else {
      planName = 'free'
      isActive = false
    }

    const limits = LIMITS[planName] || LIMITS.free
    const used = type === 'image' ? (profile.images_used || 0) : (profile.requests_used || 0)
    const limit = type === 'image' ? limits.images : limits.text

    console.log('📊 Rate Check:', {
      user: userId.substring(0, 8),
      plan: planName,
      type,
      used,
      limit
    })

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
      usage: used,
      limit: limit,
      currentRequests: profile.requests_used || 0,
      currentImages: profile.images_used || 0,
      requestLimit: limits.text,
      imageLimit: limits.images
    }

  } catch (error) {
    console.error('🔥 System error in checkRateLimit:', error)
    return { success: false, message: 'System busy. Please try again.' }
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
    console.error('Error incrementing usage:', error)
  }
}
