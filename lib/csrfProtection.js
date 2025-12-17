// lib/csrfProtection.js - FIXED for Next.js 15
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

// ✅ FIXED: Properly handles Next.js 15 headers
export function validateCSRF(request) {
  const method = (request?.method || 'GET').toUpperCase()
  
  const url = request?.url || ''
  const isApiRoute = url.includes('/api/')
  
  if (isSafeMethod(method) && !isApiRoute) return true
  
  // ✅ FIXED: Handle both async and sync headers
  let h = request?.headers
  
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

  if (isApiRoute && (!userAgent || userAgent.length < 10)) {
    logSuspicious('Missing or invalid user-agent on API route', meta)
    return false
  }

  const suspiciousAgents = ['curl/', 'wget/', 'python-requests/', 'go-http-client/', 'axios/', 'node-fetch/', 'postman']
  const lowerAgent = (userAgent || '').toLowerCase()
  if (isApiRoute && suspiciousAgents.some((p) => lowerAgent.includes(p))) {
    logSuspicious('Suspicious user-agent on API route', meta)
    return false
  }

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
