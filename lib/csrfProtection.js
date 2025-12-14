// lib/csrfProtection.js - FIXED: Added API route check
import { headers as nextHeaders } from 'next/headers'
import crypto from 'node:crypto'
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
  if (crypto?.randomBytes) {
    return crypto.randomBytes(32).toString('hex')
  }
  const arr = new Uint8Array(32)
  globalThis.crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function safeHeaderGet(h, name) {
  try {
    return h?.get?.(name) ?? null
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

function logSuspicious(reason, details = {}) {
  logger.security(`CSRF validation failed: ${reason}`, details)
}

export function validateCSRF(request) {
  const method = (request?.method || 'GET').toUpperCase()
  
  // ✅ NEW: Skip validation for non-API GET requests (pages)
  const url = request?.url || ''
  const isApiRoute = url.includes('/api/')
  
  // Safe methods on pages don't need CSRF (they're just rendering HTML)
  if (isSafeMethod(method) && !isApiRoute) return true
  
  // ✅ API routes ALWAYS need origin validation (even GET for sensitive data)
  const h = request?.headers ?? nextHeaders()
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
  }

  // For API routes, require user agent
  if (isApiRoute && (!userAgent || userAgent.length < 10)) {
    logSuspicious('Missing or invalid user-agent on API route', meta)
    return false
  }

  // Block obvious scripting clients on API routes
  const suspiciousAgents = ['curl/', 'wget/', 'python-requests/', 'go-http-client/', 'axios/', 'node-fetch/', 'postman']
  const lowerAgent = (userAgent || '').toLowerCase()
  if (isApiRoute && suspiciousAgents.some((p) => lowerAgent.includes(p))) {
    logSuspicious('Suspicious user-agent on API route', meta)
    return false
  }

  // Unsafe methods MUST have origin or referer
  if (!isSafeMethod(method) && !origin && !referer) {
    logSuspicious('Missing both origin and referer on unsafe method', meta)
    return false
  }

  // Validate origin if present
  if (origin && !isAllowedOrigin(origin)) {
    logSuspicious('Invalid origin', meta)
    return false
  }

  // Validate referer if present
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

  // Content-Type validation for unsafe methods
  if (!isSafeMethod(method) && contentType) {
    const ok =
      contentType.includes('application/json') ||
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')

    if (!ok) {
      logSuspicious('Unexpected content-type', meta)
      return false
    }
  }

  return true
}

export function requireCSRF(handler) {
  return async (request, context) => {
    if (!validateCSRF(request)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request origin',
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
