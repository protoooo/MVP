import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// UPDATED GENEROUS LIMITS
const LIMITS = {
  free: { text: 10, images: 0 },
  starter: { text: 2000, images: 10 },
  pro: { text: 100000, images: 250 },
  enterprise: { text: 100000, images: 1000 }
}

export async function checkRateLimit(userId) {
  try {
    // 1. Get the User's Profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('requests_used, images_used')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Rate limit check failed - profile not found:', profileError)
      return { 
        success: false, 
        message: 'Account error. Please contact support.' 
      }
    }

    // 2. Get Subscription Info
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // Determine plan
    let planName = 'free'
    if (sub && !subError) {
      planName = sub.plan || 'pro'
    }

    const planLimits = LIMITS[planName] || LIMITS.free
    
    console.log(`📊 Rate limit check for user ${userId}:`, {
      plan: planName,
      textUsed: profile.requests_used,
      textLimit: planLimits.text,
      imagesUsed: profile.images_used,
      imageLimit: planLimits.images
    })

    // 3. Check Text Limits
    if (profile.requests_used >= planLimits.text) {
      return { 
        success: false, 
        limitReached: true, 
        message: `${planName === 'free' ? 'Free trial limit' : 'Monthly text query limit'} reached. Upgrade your plan to continue.`,
        plan: planName
      }
    }

    // Return usage data
    return { 
      success: true, 
      plan: planName,
      imageLimit: planLimits.images,
      currentImages: profile.images_used || 0,
      textUsed: profile.requests_used || 0,
      textLimit: planLimits.text
    }
  } catch (error) {
    console.error('❌ Rate limit check system error:', error)
    return {
      success: false,
      message: 'System error. Please try again.'
    }
  }
}
