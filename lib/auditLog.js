// lib/auditLog.js
import { createClient } from '@supabase/supabase-js'

// 1. SAFETY CHECK: Only create the client if we are on the SERVER
const supabase = (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

// 2. SAFETY WRAPPER: Don't run this function if Supabase failed to load
export async function logSecurityEvent(event) {
  // If we are on the client (browser), STOP here.
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security logging skipped: Client-side execution')
    }
    return { success: false }
  }

  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: event.userId || null,
      event_type: event.type,
      details: event.details || {},
      ip_address: event.ip || null,
      user_agent: event.userAgent || null,
      timestamp: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to log security event:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Audit log error:', error)
    return { success: false, error: error.message }
  }
}

// ... export other functions ...
// Ensure other exports like logAuthEvent also call logSecurityEvent
// or check for 'supabase' existence.

export async function logAuthEvent(userId, eventType, details, request) {
  if (!supabase) return { success: false } // Add this check to all exported functions
  // ... rest of function
}
