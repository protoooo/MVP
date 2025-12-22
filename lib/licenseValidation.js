// lib/licenseValidation.js - FIXED: Payment method enforcement for multi-location
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAX_LOCATIONS_SINGLE = 4
const LOCATION_WINDOW_DAYS = 7
const GRACE_PERIOD_DAYS = 7

function generateLocationFingerprint(sessionInfo = {}) {
  const { ip = 'unknown' } = sessionInfo
  const ipPrefix = ip.split('.').slice(0, 3).join('.')
  
  let hash = 0
  const str = `${ipPrefix}`
  
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return `net_${Math.abs(hash).toString(36)}`
}

export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
    // Check if user is whitelisted (multi-location subscribers)
    const whitelisted = await isWhitelisted(userId)
    if (whitelisted) {
      logger.info('User whitelisted - multi-location access', { userId })
      return { valid: true, whitelisted: true }
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, metadata, created_at, stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError || !subscription) {
      logger.warn('No active subscription found', { userId })
      return { valid: false, error: 'No active subscription found', needsSubscription: true }
    }

    const currentFingerprint = generateLocationFingerprint(sessionInfo)
    
    // Get location usage history
    const windowStart = new Date(Date.now() - LOCATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data: recentLocations, error: historyError } = await supabase
      .from('location_access_log')
      .select('location_fingerprint, created_at, ip_prefix')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (historyError) {
      logger.error('Failed to fetch location history', { error: historyError.message, userId })
      logger.security('Location check unavailable - allowing access', { userId })
      return { valid: true, warning: 'Location check unavailable' }
    }

    // Get unique locations
    const uniqueLocations = new Set(
      (recentLocations || []).map(r => r.location_fingerprint)
    )
    uniqueLocations.add(currentFingerprint)

    // ✅ FIX: Multi-location detection with payment verification
    if (uniqueLocations.size > MAX_LOCATIONS_SINGLE) {
      
      // ✅ CRITICAL FIX: Verify payment method exists BEFORE granting grace period
      if (!subscription.stripe_subscription_id) {
        logger.security('Multi-location without Stripe subscription', {
          userId,
          uniqueLocations: uniqueLocations.size
        })
        
        return {
          valid: false,
          error: `We detected ${uniqueLocations.size} locations. Each location requires its own license. Please add a payment method to upgrade.`,
          code: 'MULTI_LOCATION_PAYMENT_REQUIRED',
          requiresUpgrade: true,
          uniqueLocationsUsed: uniqueLocations.size,
          suggestedPrice: 149 * uniqueLocations.size
        }
      }
      
      // ✅ CRITICAL FIX: Verify payment method with Stripe
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
        
        if (!stripeSubscription.default_payment_method) {
          logger.security('Multi-location without payment method', {
            userId,
            uniqueLocations: uniqueLocations.size,
            stripeStatus: stripeSubscription.status
          })
          
          return {
            valid: false,
            error: `We detected ${uniqueLocations.size} locations. Please add a payment method to upgrade to multi-location pricing.`,
            code: 'MULTI_LOCATION_PAYMENT_METHOD_REQUIRED',
            requiresUpgrade: true,
            uniqueLocationsUsed: uniqueLocations.size,
            suggestedPrice: 149 * uniqueLocations.size
          }
        }
        
        logger.info('Multi-location with payment method verified', {
          userId,
          uniqueLocations: uniqueLocations.size,
          hasPaymentMethod: true
        })
        
      } catch (stripeError) {
        logger.error('Stripe verification failed for multi-location', {
          error: stripeError.message,
          userId
        })
        
        // If Stripe is down, use conservative 5-minute grace period
        const STRIPE_FALLBACK_GRACE_MINUTES = 5
        const firstMultiLocationUse = recentLocations.find(r => 
          r.location_fingerprint !== recentLocations[0].location_fingerprint
        )
        
        if (firstMultiLocationUse) {
          const gracePeriodEnd = new Date(
            new Date(firstMultiLocationUse.created_at).getTime() + 
            STRIPE_FALLBACK_GRACE_MINUTES * 60 * 1000
          )
          
          const now = new Date()
          
          if (now < gracePeriodEnd) {
            logger.warn('Multi-location using fallback grace (Stripe unreachable)', {
              userId,
              minutesRemaining: Math.round((gracePeriodEnd - now) / (1000 * 60))
            })
            
            await logLocationAccess(userId, currentFingerprint, sessionInfo)
            
            return {
              valid: true,
              warning: 'STRIPE_VERIFICATION_UNAVAILABLE',
              requiresUpgrade: true,
              uniqueLocationsUsed: uniqueLocations.size,
              locationFingerprint: currentFingerprint
            }
          }
        }
        
        // Fallback grace expired - require upgrade
        return {
          valid: false,
          error: `This license is being used from ${uniqueLocations.size} locations. Please verify your payment method and upgrade.`,
          code: 'MULTI_LOCATION_VERIFICATION_FAILED',
          requiresUpgrade: true,
          uniqueLocationsUsed: uniqueLocations.size
        }
      }
      
      // ✅ Payment method verified - now check grace period
      const firstMultiLocationUse = recentLocations.find(r => 
        r.location_fingerprint !== recentLocations[0].location_fingerprint
      )
      
      const gracePeriodEnd = firstMultiLocationUse 
        ? new Date(new Date(firstMultiLocationUse.created_at).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
        : new Date()
      
      const now = new Date()
      const inGracePeriod = now < gracePeriodEnd
      
      if (inGracePeriod) {
        const daysRemaining = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24))
        
        logger.warn('Multiple locations detected - grace period (payment method verified)', {
          userId,
          uniqueLocations: uniqueLocations.size,
          daysRemaining,
          hasPaymentMethod: true
        })

        await logLocationAccess(userId, currentFingerprint, sessionInfo)
        
        return {
          valid: true,
          warning: `MULTI_LOCATION_DETECTED`,
          requiresUpgrade: true,
          gracePeriodDaysRemaining: daysRemaining,
          uniqueLocationsUsed: uniqueLocations.size,
          locationFingerprint: currentFingerprint,
          message: `We detected ${uniqueLocations.size} locations in the past week. You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} to upgrade to multi-location pricing ($${149 * uniqueLocations.size}/month for ${uniqueLocations.size} locations).`
        }
      }

      // Grace period expired - require upgrade
      logger.security('Multiple locations - grace period expired', {
        userId,
        uniqueLocations: uniqueLocations.size,
      })

      return {
        valid: false,
        error: `This license is being used from ${uniqueLocations.size} different locations. Each location needs its own license.`,
        code: 'MULTI_LOCATION_UPGRADE_REQUIRED',
        requiresUpgrade: true,
        uniqueLocationsUsed: uniqueLocations.size,
        suggestedPrice: 149 * uniqueLocations.size,
        upgradeUrl: process.env.NEXT_PUBLIC_BASE_URL + '/?upgrade=multi-location'
      }
    }

    // Valid - single location
    await logLocationAccess(userId, currentFingerprint, sessionInfo)

    return { 
      valid: true, 
      locationFingerprint: currentFingerprint,
      uniqueLocationsUsed: uniqueLocations.size 
    }

  } catch (error) {
    logger.error('License validation exception', { error: error.message, userId })
    return { valid: true, warning: 'Validation unavailable' }
  }
}

async function logLocationAccess(userId, locationFingerprint, sessionInfo) {
  try {
    const { error } = await supabase
      .from('location_access_log')
      .insert({
        user_id: userId,
        location_fingerprint: locationFingerprint,
        ip_prefix: sessionInfo.ip?.substring(0, 12) + '***',
        user_agent: sessionInfo.userAgent?.substring(0, 200),
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.warn('Failed to log location access', { error: error.message })
    }
  } catch (error) {
    logger.warn('Location logging exception', { error: error.message })
  }
}

export async function logSessionActivity(userId, sessionInfo) {
  try {
    const fingerprint = generateLocationFingerprint(sessionInfo)
    await logLocationAccess(userId, fingerprint, sessionInfo)
  } catch (error) {
    logger.warn('Session activity logging failed', { error: error.message, userId })
  }
}

export async function getUserLocationSummary(userId) {
  try {
    const windowStart = new Date(Date.now() - LOCATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('location_access_log')
      .select('location_fingerprint, ip_prefix, created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    const locations = {}
    
    for (const record of data || []) {
      const fp = record.location_fingerprint
      if (!locations[fp]) {
        locations[fp] = {
          fingerprint: fp,
          firstSeen: record.created_at,
          lastSeen: record.created_at,
          accessCount: 0,
          ipPrefixes: new Set()
        }
      }
      
      locations[fp].lastSeen = record.created_at
      locations[fp].accessCount++
      locations[fp].ipPrefixes.add(record.ip_prefix)
    }

    return {
      uniqueLocations: Object.keys(locations).length,
      locations: Object.values(locations).map(loc => ({
        ...loc,
        ipPrefixes: Array.from(loc.ipPrefixes)
      })),
      windowDays: LOCATION_WINDOW_DAYS,
      maxAllowed: MAX_LOCATIONS_SINGLE
    }
  } catch (error) {
    logger.error('Failed to get location summary', { error: error.message, userId })
    return null
  }
}

export async function registerLocation(userId, sessionInfo) {
  try {
    const locationFingerprint = generateLocationFingerprint(sessionInfo)
    await logLocationAccess(userId, locationFingerprint, sessionInfo)

    logger.audit('Location registered', {
      userId,
      locationFingerprint: locationFingerprint.substring(0, 8) + '***'
    })

    return { success: true, locationFingerprint }
  } catch (error) {
    logger.error('Location registration exception', { error: error.message, userId })
    return { success: false, error: 'Registration failed' }
  }
}

export async function whitelistUser(userId, reason) {
  try {
    const { error } = await supabase
      .from('location_whitelist')
      .insert({
        user_id: userId,
        reason,
        whitelisted_at: new Date().toISOString()
      })

    if (error) throw error

    logger.audit('User whitelisted for multi-location', { userId, reason })
    return { success: true }
  } catch (error) {
    logger.error('Whitelist failed', { error: error.message, userId })
    return { success: false, error: error.message }
  }
}

async function isWhitelisted(userId) {
  try {
    const { data } = await supabase
      .from('location_whitelist')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    return !!data
  } catch (error) {
    logger.warn('Whitelist check failed', { error: error.message, userId })
    return false
  }
}

export async function removeWhitelist(userId) {
  try {
    const { error } = await supabase
      .from('location_whitelist')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    logger.audit('User removed from whitelist', { userId })
    return { success: true }
  } catch (error) {
    logger.error('Whitelist removal failed', { error: error.message, userId })
    return { success: false, error: error.message }
  }
}
