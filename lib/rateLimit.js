import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// SECURITY: More strict guest detection
function isGuestUser(identifier) {
  if (!identifier || typeof identifier !== 'string') return true
  
  // UUID pattern check (authenticated users)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(identifier)) return false
  
  // Known guest patterns
  const guestPatterns = ['guest_', 'fallback_', 'guest_ip', 'unknown', 'anonymous']
  return guestPatterns.some(pattern => identifier.toLowerCase().includes(pattern))
}

export async function checkRateLimit(identifier, type = 'text') {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  
  const isGuest = isGuestUser(identifier)
  
  // SECURITY: Stricter limits for guests
  const limit = isGuest 
    ? (type === 'image' ? 2 : 5) // Very limited for demos
    : (type === 'image' ? 50 : 200) // Generous for paid users

  console.log(`[RateLimit] Check: ${identifier.substring(0, 20)}... | Type: ${type} | Guest: ${isGuest} | Limit: ${limit}`)

  try {
    const { data: usage } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('identifier', identifier)
      .maybeSingle()

    if (!usage) {
      // First request - create record
      await supabase.from('rate_limits').insert({
        identifier,
        request_count: 1,
        window_start: new Date(now).toISOString()
      })
      console.log(`[RateLimit] First request for ${identifier.substring(0, 20)}...`)
      return { success: true, remaining: limit - 1 }
    }

    const windowStart = new Date(usage.window_start).getTime()

    if ((now - windowStart) < windowMs) {
      // Within window - check limit
      if (usage.request_count >= limit) {
        console.warn(`[RateLimit] BLOCKED: ${identifier.substring(0, 20)}... (${usage.request_count}/${limit})`)
        return { 
          success: false, 
          remaining: 0,
          resetAt: new Date(windowStart + windowMs).toISOString()
        }
      }
      
      // Increment counter
      await supabase.from('rate_limits')
        .update({ request_count: usage.request_count + 1 })
        .eq('identifier', identifier)
      
      const remaining = limit - (usage.request_count + 1)
      console.log(`[RateLimit] Allowed. Remaining: ${remaining}/${limit}`)
      return { success: true, remaining }
    } else {
      // Window expired - reset
      await supabase.from('rate_limits')
        .update({ 
          request_count: 1, 
          window_start: new Date(now).toISOString() 
        })
        .eq('identifier', identifier)
      
      console.log(`[RateLimit] Window reset for ${identifier.substring(0, 20)}...`)
      return { success: true, remaining: limit - 1 }
    }
  } catch (error) {
    console.error('[RateLimit] Database error:', error)
    // SECURITY: Fail closed on error
    return { success: false, remaining: 0, error: 'Rate limit check failed' }
  }
}

export async function incrementUsage(identifier, type) {
  // Analytics tracking only - doesn't affect limits
  try {
    await supabase.from('usage_events').insert({
      identifier,
      event_type: type,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[RateLimit] Failed to log usage event:', error)
  }
  return { success: true }
}
