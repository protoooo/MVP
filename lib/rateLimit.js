// lib/rateLimit.js
// COMPLETE REWRITE - FIXES UNLIMITED SHOWING AS MONTHLY LIMIT

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================
// CORRECT PLAN LIMITS
// ============================================
const LIMITS = {
  free: { 
    text: 10, 
    images: 0,
    description: 'Free Trial'
  },
  protocollm: { 
    text: 999999, // Effectively unlimited
    images: 999999, // Effectively unlimited
    description: 'protocolLM Plan'
  }
}

export async function checkRateLimit(userId) {
  try {
    // ============================================
    // STEP 1: Get User Profile
    // ============================================
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

    // ============================================
    // STEP 2: CRITICAL - Check subscriptions table ONLY
    // ============================================
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // Determine plan
    let planName = 'free'
    let isActive = false
    
    if (sub && !subError) {
      // SECURITY CHECK: Verify subscription hasn't expired
      const periodEnd = new Date(sub.current_period_end)
      const now = new Date()
      
      if (periodEnd < now) {
        console.log('⚠️ Subscription expired for user:', userId.substring(0, 8))
        planName = 'free'
        
        // Mark as expired in database
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', sub.status)
        
        // Sync to profile
        await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      } else {
        // VALID SUBSCRIPTION
        planName = sub.plan || 'protocollm'
        isActive = true
        
        console.log('✅ Active subscription found:', {
          plan: planName,
          status: sub.status,
          expires: periodEnd.toISOString()
        })
      }
    } else {
      console.log('❌ No active subscription found')
    }

    const planLimits = LIMITS[planName] || LIMITS.free
    
    // ============================================
    // STEP 3: Log Current Status
    // ============================================
    console.log(`📊 Rate limit check for user ${userId.substring(0, 8)}:`, {
      plan: planName,
      status: sub?.status || 'none',
      periodEnd: sub?.current_period_end || 'N/A',
      textUsed: profile.requests_used || 0,
      textLimit: planLimits.text,
      imagesUsed: profile.images_used || 0,
      imageLimit: planLimits.images,
      isUnlimited: planName === 'protocollm'
    })

    // ============================================
    // STEP 4: Check if over limit
    // ============================================
    const textUsed = profile.requests_used || 0
    const imagesUsed = profile.images_used || 0
    
    // For paid plans, limits are so high they're effectively unlimited
    if (textUsed >= planLimits.text) {
      return { 
        success: false, 
        limitReached: true, 
        message: planName === 'free' 
          ? 'Free trial limit reached. Please subscribe to continue.' 
          : 'Monthly text query limit reached. Your limit resets at the next billing cycle.',
        plan: planName
      }
    }

    // ============================================
    // STEP 5: Return usage data
    // ============================================
    return { 
      success: true, 
      plan: planName,
      planDescription: planLimits.description,
      imageLimit: planLimits.images,
      currentImages: imagesUsed,
      textUsed: textUsed,
      textLimit: planLimits.text,
      isUnlimited: planName === 'protocollm',
      periodEnd: sub?.current_period_end || null
    }
  } catch (error) {
    console.error('❌ Rate limit check system error:', error)
    return {
      success: false,
      message: 'System error. Please try again.'
    }
  }
}

// ============================================
// HELPER: Reset usage for new billing cycle
// ============================================
export async function resetUsageForUser(userId) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        requests_used: 0,
        images_used: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('❌ Failed to reset usage:', error)
      return false
    }
    
    console.log('✅ Usage reset for user:', userId.substring(0, 8))
    return true
  } catch (error) {
    console.error('❌ Reset usage error:', error)
    return false
  }
}
