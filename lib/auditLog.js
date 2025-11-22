// lib/auditLog.js
// FIXED: Proper lazy initialization

import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null

function getSupabase() {
  if (supabaseInstance) return supabaseInstance
  
  // Only create if we're on server and have credentials
  if (typeof window === 'undefined' && 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabaseInstance = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      return supabaseInstance
    } catch (error) {
      console.error('[AuditLog] Failed to create Supabase client:', error)
      return null
    }
  }
  return null
}

export async function logSecurityEvent(event) {
  // Client-side safety check
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuditLog] Security logging skipped: Client-side execution')
    }
    return { success: false }
  }

  const supabase = getSupabase()
  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuditLog] Supabase client not available')
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
      console.error('[AuditLog] Failed to log security event:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[AuditLog] Audit log error:', error)
    return { success: false, error: error.message }
  }
}

export async function logAuthEvent(userId, eventType, details, request) {
  const supabase = getSupabase()
  if (!supabase) return { success: false }
  
  try {
    return await logSecurityEvent({
      userId,
      type: eventType,
      details,
      ip: request?.headers?.get('x-forwarded-for') || null,
      userAgent: request?.headers?.get('user-agent') || null
    })
  } catch (error) {
    console.error('[AuditLog] Auth event error:', error)
    return { success: false }
  }
}
