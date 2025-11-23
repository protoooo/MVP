import { createClient } from '@supabase/supabase-js'

let supabase = null

function getSupabase() {
  if (!supabase && typeof window === 'undefined') {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return supabase
}

const LIMITS = {
  chat: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  image: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  auth: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  }
}

export async function checkRateLimit(userId, action = 'chat') {
  const db = getSupabase()
  if (!db) {
    console.error('[RateLimit] Supabase not initialized')
    return { allowed: true, remainingRequests: 999, resetTime: Date.now(), retryAfter: 0 }
  }

  const now = Date.now()
  const limits = LIMITS[action] || LIMITS.chat
  const { maxRequests, windowMs } = limits
  const windowStart = now - windowMs

  try {
    // Try to fetch existing record
    const { data: existing, error: fetchError } = await db
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('action', action)
      .single()

    // If table doesn't exist or schema is wrong, fail gracefully
    if (fetchError && fetchError.code !== 'PGRST116') {
      if (fetchError.message?.includes('column') || fetchError.code === '42703') {
        console.error('[RateLimit] Database schema error - rate_limits table needs migration')
        console.error('[RateLimit] Run the SQL migration in Supabase dashboard')
        return { allowed: true, remainingRequests: maxRequests, resetTime: now + windowMs, retryAfter: 0 }
      }
      console.error('[RateLimit] Fetch error:', fetchError)
      return { allowed: true, remainingRequests: maxRequests, resetTime: now + windowMs, retryAfter: 0 }
    }

    // No existing record or window expired - create/update
    if (!existing || existing.window_start < windowStart) {
      const newRecord = {
        user_id: userId,
        action: action,
        request_count: 1,
        window_start: now,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await db
          .from('rate_limits')
          .update(newRecord)
          .eq('id', existing.id)
        
        if (updateError) {
          console.error('[RateLimit] Update error:', updateError)
        }
      } else {
        // Insert new record
        const { error: insertError } = await db
          .from('rate_limits')
          .insert(newRecord)
        
        if (insertError) {
          console.error('[RateLimit] Insert error:', insertError)
        }
      }

      return {
        allowed: true,
        remainingRequests: maxRequests - 1,
        resetTime: now + windowMs,
        retryAfter: 0
      }
    }

    // Check if limit exceeded
    if (existing.request_count >= maxRequests) {
      const resetTime = existing.window_start + windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        retryAfter,
        message: `Rate limit exceeded. Please wait ${retryAfter} seconds.`
      }
    }

    // Increment counter
    const { error: updateError } = await db
      .from('rate_limits')
      .update({
        request_count: existing.request_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('[RateLimit] Update error:', updateError)
    }

    return {
      allowed: true,
      remainingRequests: maxRequests - existing.request_count - 1,
      resetTime: existing.window_start + windowMs,
      retryAfter: 0
    }

  } catch (error) {
    console.error('[RateLimit] System error:', error)
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remainingRequests: maxRequests, resetTime: now + windowMs, retryAfter: 0 }
  }
}

export async function resetRateLimit(userId, action = 'chat') {
  const db = getSupabase()
  if (!db) return

  try {
    await db
      .from('rate_limits')
      .delete()
      .eq('user_id', userId)
      .eq('action', action)
  } catch (error) {
    console.error('[RateLimit] Reset error:', error)
  }
}
