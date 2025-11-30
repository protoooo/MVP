import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    // 2. CRITICAL SECURITY FIX: ONLY check subscriptions table
    // REMOVED: Legacy is_subscribed bypass vulnerability
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // Determine plan - default to 'free' if no active subscription
    let planName = 'free'
    
    if (sub && !subError) {
      // SECURITY CHECK: Verify subscription hasn't expired
      const periodEnd = new Date(sub.current_period_end)
      const now = new Date()
      
      if (periodEnd < now) {
        console.log('⚠️ Subscription expired:', sub.plan)
        planName = 'free'
        
        // Mark subscription as expired in database
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', sub.status)
      } else {
        planName = sub.plan || 'pro'
      }
    }

    const planLimits = LIMITS[planName] || LIMITS.free
    
    console.log(`📊 Rate limit check for user ${userId}:`, {
      plan: planName,
      status: sub?.status || 'none',
      periodEnd: sub?.current_period_end || 'N/A',
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
        message: `${planName === 'free' ? 'Free trial limit' : 'Monthly text query limit'} reached. ${planName === 'free' ? 'Please subscribe to continue.' : 'Your limit resets at the next billing cycle.'}`,
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
