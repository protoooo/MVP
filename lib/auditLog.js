// lib/auditLog.js
// Security event audit logging

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Log a security-relevant event
 * @param {Object} event - Event details
 * @param {string} event.userId - User ID (optional for anonymous events)
 * @param {string} event.type - Event type (e.g., 'rate_limit_exceeded', 'auth_failure')
 * @param {Object} event.details - Additional event details
 * @param {string} event.ip - Client IP address
 * @param {string} event.userAgent - Client user agent
 */
export async function logSecurityEvent(event) {
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

/**
 * Log authentication events
 */
export async function logAuthEvent(userId, eventType, details, request) {
  return logSecurityEvent({
    userId,
    type: `auth_${eventType}`,
    details,
    ip: getClientIp(request),
    userAgent: request?.headers?.get('user-agent')
  })
}

/**
 * Log rate limit events
 */
export async function logRateLimitEvent(userId, endpoint, details, request) {
  return logSecurityEvent({
    userId,
    type: 'rate_limit_exceeded',
    details: { endpoint, ...details },
    ip: getClientIp(request),
    userAgent: request?.headers?.get('user-agent')
  })
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(userId, activityType, details, request) {
  return logSecurityEvent({
    userId,
    type: `suspicious_${activityType}`,
    details,
    ip: getClientIp(request),
    userAgent: request?.headers?.get('user-agent')
  })
}

/**
 * Log CSRF token validation failures
 */
export async function logCsrfFailure(userId, details, request) {
  return logSecurityEvent({
    userId,
    type: 'csrf_validation_failed',
    details,
    ip: getClientIp(request),
    userAgent: request?.headers?.get('user-agent')
  })
}

/**
 * Get recent security events for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of events to return
 * @param {string[]} eventTypes - Filter by event types (optional)
 */
export async function getRecentEvents(userId, limit = 50, eventTypes = null) {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return { success: false, error: error.message }
    }

    return { success: true, events: data }
  } catch (error) {
    console.error('Get events error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get security summary for a user
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back
 */
export async function getSecuritySummary(userId, days = 30) {
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('audit_logs')
      .select('event_type')
      .eq('user_id', userId)
      .gte('timestamp', since.toISOString())

    if (error) {
      console.error('Failed to fetch security summary:', error)
      return { success: false, error: error.message }
    }

    // Count events by type
    const summary = data.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})

    return { 
      success: true, 
      summary,
      totalEvents: data.length,
      period: `${days} days`
    }
  } catch (error) {
    console.error('Security summary error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Detect potential security threats
 * @param {string} userId - User ID
 * @param {number} timeWindowMinutes - Time window to check (default 15 minutes)
 */
export async function detectThreats(userId, timeWindowMinutes = 15) {
  try {
    const since = new Date()
    since.setMinutes(since.getMinutes() - timeWindowMinutes)

    const { data, error } = await supabase
      .from('audit_logs')
      .select('event_type, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Failed to detect threats:', error)
      return { success: false, error: error.message }
    }

    const threats = []

    // Check for multiple failed auth attempts
    const authFailures = data.filter(e => e.event_type === 'auth_failure').length
    if (authFailures >= 3) {
      threats.push({
        type: 'multiple_auth_failures',
        severity: 'high',
        count: authFailures,
        message: `${authFailures} failed authentication attempts in ${timeWindowMinutes} minutes`
      })
    }

    // Check for excessive rate limiting
    const rateLimitHits = data.filter(e => e.event_type === 'rate_limit_exceeded').length
    if (rateLimitHits >= 5) {
      threats.push({
        type: 'excessive_rate_limiting',
        severity: 'medium',
        count: rateLimitHits,
        message: `Hit rate limit ${rateLimitHits} times in ${timeWindowMinutes} minutes`
      })
    }

    // Check for CSRF failures
    const csrfFailures = data.filter(e => e.event_type === 'csrf_validation_failed').length
    if (csrfFailures >= 2) {
      threats.push({
        type: 'csrf_attack_attempt',
        severity: 'critical',
        count: csrfFailures,
        message: `${csrfFailures} CSRF validation failures in ${timeWindowMinutes} minutes`
      })
    }

    // Check for suspicious activity
    const suspiciousEvents = data.filter(e => e.event_type.startsWith('suspicious_')).length
    if (suspiciousEvents >= 2) {
      threats.push({
        type: 'suspicious_activity_pattern',
        severity: 'high',
        count: suspiciousEvents,
        message: `${suspiciousEvents} suspicious activities detected in ${timeWindowMinutes} minutes`
      })
    }

    return {
      success: true,
      threats,
      hasThreats: threats.length > 0,
      riskLevel: threats.length === 0 ? 'low' : 
                 threats.some(t => t.severity === 'critical') ? 'critical' :
                 threats.some(t => t.severity === 'high') ? 'high' : 'medium'
    }
  } catch (error) {
    console.error('Threat detection error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get client IP address from request
 * @private
 */
function getClientIp(request) {
  if (!request) return null
  
  // Check various headers that might contain the client IP
  const forwardedFor = request.headers?.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers?.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return request.headers?.get('cf-connecting-ip') || null
}

/**
 * Event types for reference
 */
export const EVENT_TYPES = {
  // Authentication
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILURE: 'auth_failure',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_SESSION_EXPIRED: 'auth_session_expired',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  RATE_LIMIT_RESET: 'rate_limit_reset',
  
  // CSRF
  CSRF_VALIDATION_FAILED: 'csrf_validation_failed',
  CSRF_TOKEN_MISSING: 'csrf_token_missing',
  
  // Suspicious Activity
  SUSPICIOUS_INPUT: 'suspicious_input',
  SUSPICIOUS_FILE_UPLOAD: 'suspicious_file_upload',
  SUSPICIOUS_ACCESS_PATTERN: 'suspicious_access_pattern',
  
  // Account Actions
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_DELETED: 'account_deleted',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_CHANGED: 'email_changed',
  
  // Subscription
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed'
}
