// lib/csrfProtection.js - Enterprise CSRF with safe diagnostics (no token leakage)
import { logger } from './logger'

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

export function generateCSRFToken() {
  const webCrypto = globalThis.crypto
  if (webCrypto?.getRandomValues) {
    const arr = new Uint8Array(32)
    webCrypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  const fallback = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  return fallback.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeHeaderGet(headers, name) {
  try {
    if (typeof headers?.get === 'function') return headers.get(name) ?? null
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

function requestId() {
  try {
    return globalThis.crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  } catch {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export function validateCSRFToken(request) {
  const cookieToken = safeCookieGet(request.cookies, 'csrf-token')
  const headerToken = safeHeaderGet(request.headers, 'x-csrf-token')

  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false

  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  return mismatch === 0
}

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
    url,
    origin,
    referer,
    userAgent: userAgent?.substring(0, 140),
    contentType: contentType?.substring(0, 120),
    ip: getClientIp(request),
    hasCookieToken: !!safeCookieGet(request.cookies, 'csrf-token'),
    hasHeaderToken: !!safeHeaderGet(request.headers, 'x-csrf-token'),
  }

  // ✅ Token validation for unsafe API requests
  if (!isSafeMethod(method) && isApiRoute) {
    if (process.env.NODE_ENV === 'production') {
      if (!validateCSRFToken(request)) {
        logger.security('CSRF token validation failed', meta)
        return false
      }
    } else {
      if (!validateCSRFToken(request)) {
        logger.warn('CSRF token validation failed (dev mode allowed)', meta)
      }
    }
  }

  // User-Agent required for API routes
  if (isApiRoute && (!userAgent || userAgent.length < 10)) {
    logger.security('CSRF validation failed: missing/invalid user-agent', meta)
    return false
  }

  // Block obvious scripts on API routes
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
    logger.security('CSRF validation failed: suspicious user-agent', meta)
    return false
  }

  // Origin/Referer required for unsafe methods
  if (!isSafeMethod(method) && !origin && !referer) {
    logger.security('CSRF validation failed: missing origin+referer', meta)
    return false
  }

  if (origin && !isAllowedOrigin(origin)) {
    logger.security('CSRF validation failed: invalid origin', meta)
    return false
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (!ALLOWED_ORIGINS.includes(refOrigin)) {
        logger.security('CSRF validation failed: invalid referer', meta)
        return false
      }
    } catch {
      logger.security('CSRF validation failed: malformed referer', meta)
      return false
    }
  }

  // Content-Type allowlist for unsafe methods
  if (!isSafeMethod(method) && contentType) {
    const valid = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ]
    if (!valid.some((t) => contentType.includes(t))) {
      logger.security('CSRF validation failed: unexpected content-type', meta)
      return false
    }
  }

  // Rate-limit suspicious volume
  const ip = meta.ip
  if (ip !== 'unknown') {
    const key = `csrf_${ip}_${Math.floor(Date.now() / 60000)}`
    const map = global.csrfRateLimits || (global.csrfRateLimits = new Map())
    const count = map.get(key) || 0
    if (count > 100) {
      logger.security('CSRF validation failed: rate limit', { ...meta, count })
      return false
    }
    map.set(key, count + 1)
  }

  return true
}

export function requireCSRF(handler) {
  return async (request, context) => {
    const id = requestId()

    if (!validateCSRF(request)) {
      // ✅ Return a requestId so you can correlate with logs without leaking details
      return new Response(
        JSON.stringify({
          error: 'Security validation failed.',
          code: 'CSRF_VALIDATION_FAILED',
          requestId: id,
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': id,
          },
        }
      )
    }

    // Propagate request id downstream if you want to log it in routes later
    request.headers.set?.('x-request-id', id)

    return handler(request, context)
  }
}

export function validateSessionConsistency(request, storedSessionData) {
  if (!storedSessionData) return { valid: true }

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
      return { valid: false, reason: 'IP changed significantly. Please sign in again.', code: 'IP_MISMATCH' }
    }
  }

  if (storedSessionData?.userAgent && currentUserAgent) {
    if (storedSessionData.userAgent !== currentUserAgent) {
      logger.security('Session user agent mismatch', {
        stored: storedSessionData.userAgent.substring(0, 50),
        current: currentUserAgent.substring(0, 50),
      })
      return { valid: false, reason: 'Browser changed. Please sign in again.', code: 'USER_AGENT_MISMATCH' }
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
    return { valid: false, reason: 'Security validation failed. Please try again.', code: 'CSRF_FAILED' }
  }
  const sessionCheck = validateSessionConsistency(request, storedSessionData)
  if (!sessionCheck.valid) return sessionCheck
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

const csrfProtection = {
  validateCSRF,
  validateCSRFToken,
  requireCSRF,
  validateSessionConsistency,
  validateCriticalOperation,
  createSessionFingerprint,
  generateCSRFToken,
  getCSRFInfo,
  clearCSRFRateLimit,
}

export default csrfProtection
