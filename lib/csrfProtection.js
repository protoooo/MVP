// lib/csrfProtection.js - FIXED: Full CSRF Protection with Token Generation + Validation
// Uses Web Crypto for edge/runtime compatibility
import { logger } from './logger'

// ============================================================================
// CONFIGURATION
// ============================================================================

function normalizeOrigin(value) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_BASE_URL,
  'https://protocollm.org',
  'https://www.protocollm.org',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
]
  .map(normalizeOrigin)
  .filter(Boolean)

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} 64-character hex string
 */
export function generateCSRFToken() {
  const webCrypto = globalThis.crypto

  if (webCrypto?.getRandomValues) {
    const arr = new Uint8Array(32)
    webCrypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Last-resort fallback (non-cryptographic) to avoid runtime crashes
  const fallback = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  return fallback.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function safeHeaderGet(headers, name) {
  try {
    if (typeof headers?.get === 'function') {
      return headers.get(name) ?? null
    }
    return null
  } catch {
    return null
  }
}

function safeCookieGet(cookies, name) {
  try {
    if (typeof cookies?.get === 'function') {
      const cookie = cookies.get(name)
      return cookie?.value ?? null
    }
    return null
  } catch {
    return null
  }
}

function isSafeMethod(method) {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
}

function isAllowedOrigin(candidate) {
  if (!candidate) return false
  try {
    const origin = new URL(candidate).origin
    return ALLOWED_ORIGINS.includes(origin)
  } catch {
    return false
  }
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function logSuspicious(reason, details = {}) {
  logger.security(`CSRF validation failed: ${reason}`, details)
}

// ============================================================================
// ✅ TOKEN VALIDATION
// ============================================================================

/**
 * Validate CSRF token from request (double-submit cookie pattern)
 * @param {Request} request - Next.js request object
 * @returns {boolean} True if token is valid
 */
export function validateCSRFToken(request) {
  const cookieToken = safeCookieGet(request.cookies, 'csrf-token')
  if (!cookieToken) return false

  const headerToken = safeHeaderGet(request.headers, 'x-csrf-token')
  if (!headerToken) return false

  if (cookieToken.length !== headerToken.length) return false

  // Constant-time-ish compare
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  return mismatch === 0
}

// ============================================================================
// MAIN CSRF VALIDATION
// ============================================================================

/**
 * ✅ ENHANCED: Validate CSRF protection with token validation
 * @param {Request} request - Next.js request object
 * @returns {boolean} True if request passes CSRF validation
 */
export function validateCSRF(request) {
  const method = (request?.method || 'GET').toUpperCase()
  const url = request?.url || ''
  const isApiRoute = url.includes('/api/')

  // Safe methods on non-API routes don't need CSRF protection
  if (isSafeMethod(method) && !isApiRoute) return true

  const h = request?.headers

  const origin = safeHeaderGet(h, 'origin')
  const referer = safeHeaderGet(h, 'referer')
  const userAgent = safeHeaderGet(h, 'user-agent')
  const contentType = safeHeaderGet(h, 'content-type') || ''

  const meta = {
    method,
    origin,
    referer,
    userAgent: userAgent?.substring(0, 140),
    contentType: contentType?.substring(0, 120),
    url: request?.url,
    ip: getClientIp(request),
  }

  // ============================================================================
  // ✅ CSRF Token Validation (unsafe methods on API routes)
  // ============================================================================
  if (!isSafeMethod(method) && isApiRoute) {
    if (process.env.NODE_ENV === 'production') {
      if (!validateCSRFToken(request)) {
        logSuspicious('Invalid or missing CSRF token', meta)
        return false
      }
      logger.debug('CSRF token validated successfully', { ip: meta.ip })
    } else {
      if (!validateCSRFToken(request)) {
        logger.warn('CSRF token validation failed (development mode - allowed)', meta)
      }
    }
  }

  // ============================================================================
  // CHECK 1: User-Agent Validation (API routes only)
  // ============================================================================
  if (isApiRoute && (!userAgent || userAgent.length < 10)) {
    logSuspicious('Missing or invalid user-agent on API route', meta)
    return false
  }

  // ============================================================================
  // CHECK 2: Block Known Bot/Script User-Agents (API routes only)
  // ============================================================================
  const suspiciousAgents = [
    'curl/',
    'wget/',
    'python-requests/',
    'go-http-client/',
    'axios/',
    'node-fetch/',
    'postman',
    'insomnia',
    'httpie',
  ]
  const lowerAgent = (userAgent || '').toLowerCase()

  if (isApiRoute && suspiciousAgents.some((p) => lowerAgent.includes(p))) {
    logSuspicious('Suspicious user-agent on API route', meta)
    return false
  }

  // ============================================================================
  // CHECK 3: Origin/Referer Validation (Unsafe Methods)
  // ============================================================================
  if (!isSafeMethod(method) && !origin && !referer) {
    logSuspicious('Missing both origin and referer on unsafe method', meta)
    return false
  }

  if (origin && !isAllowedOrigin(origin)) {
    logSuspicious('Invalid origin', meta)
    return false
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (!ALLOWED_ORIGINS.includes(refOrigin)) {
        logSuspicious('Invalid referer', meta)
        return false
      }
    } catch {
      logSuspicious('Malformed referer', meta)
      return false
    }
  }

  // ============================================================================
  // CHECK 4: Content-Type Validation (Unsafe Methods)
  // ============================================================================
  if (!isSafeMethod(method) && contentType) {
    const validContentTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ]

    const isValidContentType = validContentTypes.some((type) => contentType.includes(type))

    if (!isValidContentType) {
      logSuspicious('Unexpected content-type', meta)
      return false
    }
  }

  // ============================================================================
  // CHECK 5: Rate Limit Suspicious Patterns
  // ============================================================================
  const ip = getClientIp(request)
  if (ip !== 'unknown') {
    const rateLimitKey = `csrf_${ip}_${Math.floor(Date.now() / 60000)}`
    const rateLimitMap = global.csrfRateLimits || (global.csrfRateLimits = new Map())
    const count = rateLimitMap.get(rateLimitKey) || 0

    if (count > 100) {
      logSuspicious('Excessive requests from single IP', { ...meta, count })
      return false
    }

    rateLimitMap.set(rateLimitKey, count + 1)

    if (rateLimitMap.size > 10000) {
      const currentMinute = Math.floor(Date.now() / 60000)
      for (const [key] of rateLimitMap.entries()) {
        const keyMinute = parseInt(key.split('_').pop())
        if (currentMinute - keyMinute > 10) {
          rateLimitMap.delete(key)
        }
      }
    }
  }

  return true
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Wrap an API route handler with CSRF protection
 * @param {Function} handler - API route handler
 * @returns {Function} Protected handler
 */
export function requireCSRF(handler) {
  return async (request, context) => {
    if (!validateCSRF(request)) {
      return new Response(
        JSON.stringify({
          error: 'Security validation failed.',
          code: 'CSRF_VALIDATION_FAILED',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    return handler(request, context)
  }
}

// ============================================================================
// SESSION CONSISTENCY VALIDATION (Prevent Session Hijacking)
// ============================================================================

export function validateSessionConsistency(request, storedSessionData) {
  if (!storedSessionData) {
    return { valid: true }
  }

  const currentIp = getClientIp(request)
  const currentUserAgent = safeHeaderGet(request.headers, 'user-agent')

  if (storedSessionData?.ip && currentIp !== 'unknown') {
    const stored = storedSessionData.ip.split('.')
    const current = currentIp.split('.')
    const sameNetwork = stored.slice(0, 3).join('.') === current.slice(0, 3).join('.')

    if (!sameNetwork) {
      logger.security('Session IP mismatch detected', {
        storedIp: storedSessionData.ip.substring(0, 12) + '***',
        currentIp: currentIp.substring(0, 12) + '***',
      })
      return {
        valid: false,
        reason: 'Your IP address has changed significantly. Please sign in again for security.',
        code: 'IP_MISMATCH',
      }
    }
  }

  if (storedSessionData?.userAgent && currentUserAgent) {
    if (storedSessionData.userAgent !== currentUserAgent) {
      logger.security('Session user agent mismatch', {
        stored: storedSessionData.userAgent.substring(0, 50),
        current: currentUserAgent.substring(0, 50),
      })
      return {
        valid: false,
        reason: 'Your browser has changed. Please sign in again for security.',
        code: 'USER_AGENT_MISMATCH',
      }
    }
  }

  return { valid: true }
}

export function createSessionFingerprint(request) {
  return {
    ip: getClientIp(request),
    userAgent: safeHeaderGet(request.headers, 'user-agent'),
    createdAt: new Date().toISOString(),
  }
}

export function validateCriticalOperation(request, storedSessionData) {
  if (!validateCSRF(request)) {
    return {
      valid: false,
      reason: 'Invalid request origin. Please try again.',
      code: 'CSRF_FAILED',
    }
  }

  const sessionCheck = validateSessionConsistency(request, storedSessionData)
  if (!sessionCheck.valid) {
    return sessionCheck
  }

  return { valid: true }
}

export function getCSRFInfo(request) {
  const method = (request?.method || 'GET').toUpperCase()
  const origin = safeHeaderGet(request.headers, 'origin')
  const referer = safeHeaderGet(request.headers, 'referer')
  const userAgent = safeHeaderGet(request.headers, 'user-agent')
  const cookieToken = safeCookieGet(request.cookies, 'csrf-token')
  const headerToken = safeHeaderGet(request.headers, 'x-csrf-token')

  return {
    method,
    origin,
    referer,
    userAgent: userAgent?.substring(0, 50),
    ip: getClientIp(request),
    allowedOrigins: ALLOWED_ORIGINS,
    isOriginAllowed: origin ? isAllowedOrigin(origin) : null,
    isSafeMethod: isSafeMethod(method),
    hasCookieToken: !!cookieToken,
    hasHeaderToken: !!headerToken,
    tokensMatch: cookieToken && headerToken ? cookieToken === headerToken : false,
  }
}

export function clearCSRFRateLimit() {
  if (global.csrfRateLimits) {
    global.csrfRateLimits.clear()
    logger.info('CSRF rate limit cache cleared')
  }
}

export default {
  validateCSRF,
  validateCSRFToken,
  validateSessionConsistency,
  validateCriticalOperation,
  createSessionFingerprint,
  requireCSRF,
  generateCSRFToken,
  getCSRFInfo,
  clearCSRFRateLimit,
}
