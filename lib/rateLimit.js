import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Enhanced guest detection
function isGuestUser(identifier) {
  if (!identifier || typeof identifier !== 'string') return true
  
  // UUID pattern check (authenticated users)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(identifier)) return false
  
  // Known guest patterns
  const guestPatterns = ['guest_', 'fallback_', 'guest_ip', 'unknown', 'anonymous']
  return guestPatterns.some(pattern => identifier.toLowerCase().includes(pattern))
}

// IP-based rate limiting for extra protection
function sanitizeIP(ip) {
  if (!ip) return 'unknown'
  // Remove port if present
  return ip.split(',')[0].split(':')[0].trim()
}

export async function checkRateLimit(identifier, type = 'text') {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  
  const isGuest = isGuestUser(identifier)
  
  // Stricter limits for guests
  const limit = isGuest 
    ? (type === 'image' ? 2 : 5)
    : (type === 'image' ? 50 : 200)

  try {
    const { data: usage } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('identifier', identifier)
      .maybeSingle()

    if (!usage) {
      await supabase.from('rate_limits').insert({
        identifier,
        request_count: 1,
        window_start: new Date(now).toISOString()
      })
      
      logger.info('Rate limit: First request', { 
        identifier: identifier.substring(0, 20),
        type,
        isGuest 
      })
      
      return { success: true, remaining: limit - 1 }
    }

    const windowStart = new Date(usage.window_start).getTime()

    if ((now - windowStart) < windowMs) {
      if (usage.request_count >= limit) {
        logger.warn('Rate limit: Blocked', { 
          identifier: identifier.substring(0, 20),
          count: usage.request_count,
          limit 
        })
        
        return { 
          success: false, 
          remaining: 0,
          resetAt: new Date(windowStart + windowMs).toISOString()
        }
      }
      
      await supabase.from('rate_limits')
        .update({ request_count: usage.request_count + 1 })
        .eq('identifier', identifier)
      
      const remaining = limit - (usage.request_count + 1)
      return { success: true, remaining }
    } else {
      await supabase.from('rate_limits')
        .update({ 
          request_count: 1, 
          window_start: new Date(now).toISOString() 
        })
        .eq('identifier', identifier)
      
      return { success: true, remaining: limit - 1 }
    }
  } catch (error) {
    logger.error('Rate limit: Database error', { error: error.message })
    // Fail closed on error
    return { success: false, remaining: 0, error: 'Rate limit check failed' }
  }
}

export async function incrementUsage(identifier, type) {
  try {
    await supabase.from('usage_events').insert({
      identifier,
      event_type: type,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to log usage event', { error: error.message })
  }
  return { success: true }
}

// Add IP-based blocking for abuse
export async function checkIPBlock(ip) {
  const sanitized = sanitizeIP(ip)
  
  try {
    const { data } = await supabase
      .from('blocked_ips')
      .select('reason, blocked_until')
      .eq('ip_address', sanitized)
      .maybeSingle()
    
    if (data) {
      const blockedUntil = new Date(data.blocked_until)
      if (blockedUntil > new Date()) {
        logger.security('Blocked IP attempted access', { ip: sanitized, reason: data.reason })
        return { blocked: true, reason: data.reason }
      }
    }
    
    return { blocked: false }
  } catch (error) {
    logger.error('IP block check failed', { error: error.message })
    return { blocked: false }
  }
}
