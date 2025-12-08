import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function isGuestUser(identifier) {
  if (!identifier || typeof identifier !== 'string') return true
  const guestPatterns = ['guest_', 'fallback_', 'guest_ip', 'unknown', 'anonymous']
  return guestPatterns.some(pattern => identifier.toLowerCase().startsWith(pattern))
}

export async function checkRateLimit(identifier, type = 'text') {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  
  const isGuest = isGuestUser(identifier)
  const limit = isGuest ? 3 : (type === 'image' ? 20 : 60)

  console.log(`[RateLimit] Checking limit for ${identifier.substring(0, 20)}... | Type: ${type} | IsGuest: ${isGuest} | Limit: ${limit}`)

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
    console.log(`[RateLimit] First request for ${identifier.substring(0, 20)}...`)
    return { success: true, remaining: limit - 1 }
  }

  const windowStart = new Date(usage.window_start).getTime()

  if ((now - windowStart) < windowMs) {
    if (usage.request_count >= limit) {
      console.warn(`[RateLimit] BLOCKED: ${identifier.substring(0, 20)}... exceeded limit (${usage.request_count}/${limit})`)
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
    console.log(`[RateLimit] Request allowed. Remaining: ${remaining}/${limit}`)
    return { success: true, remaining }
  } else {
    await supabase.from('rate_limits')
      .update({ 
        request_count: 1, 
        window_start: new Date(now).toISOString() 
      })
      .eq('identifier', identifier)
    
    console.log(`[RateLimit] Window reset for ${identifier.substring(0, 20)}...`)
    return { success: true, remaining: limit - 1 }
  }
}

export async function incrementUsage(identifier, type) {
  return { success: true }
}
