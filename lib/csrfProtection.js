// lib/csrfProtection.js - Enhanced CSRF protection (Production Ready)
import { headers as nextHeaders } from 'next/headers'
import crypto from 'node:crypto'
import { logger } from './logger'

// Normalize allowed origins (strip paths/trailing slashes, keep only scheme+host+port)
function normalizeOrigin(value) {
  if (!value) return null
  try {
    // If they accidentally pass a full URL with a path, URL().origin cleans it.
    return new URL(value).origin
  } catch {
    // If it's already just an origin like "https://example.com", URL() still works.
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

/**
 * Generates a CSRF token (utility).
 * NOTE: If you ever run this file in Edge runtime, node:crypto won't exist.
 * For now, you're using this mostly for origin/referrer validation, which is fine.
 */
export function generateCSRFToken() {
  // Prefer Node crypto (Route Handlers default to node runtime)
  if (crypto?.randomBytes) {
    return crypto.randomBytes(32).toString('hex')
  }

  // Fallback (rare)
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

/**
 * Origin/Referer-based CSRF guard for browser-initiated requests.
 * - Only enforced for "unsafe" methods (POST/PUT/PATCH/DELETE).
 * - Uses request.headers if provided; otherwise falls back to next/headers().
 */
export function validateCSRF(request) {
  const method = (request?.method || 'GET').toUpperCase()

  // ✅ Never block safe methods (prevents accidental breakage on GET pages)
  if (isSafeMethod(method)) return true

  const h = request?.headers ?? nextHeaders()

  const origin = safeHeaderGet(h, 'origin')
  const referer = safeHeaderGet(h, 'referer')
  const userAgent = safeHeaderGet(h, 'user-agent')
  const contentType = safeHeaderGet(h, 'content-type') || ''

  // Basic request metadata for logs
  const meta = {
    method,
    origin,
    referer,
    userAgent: userAgent?.substring(0, 140),
    contentType: contentType?.substring(0, 120),
    url: request?.url,
  }

  // Require a UA for unsafe methods (bots often omit it)
  if (!userAgent || userAgent.length < 10) {
    logSuspicious('Missing or invalid user-agent', meta)
    return false
  }

  // Block obvious scripting clients (useful if you only expect browsers)
  const suspiciousAgents = ['curl/', 'wget/', 'python-requests/', 'go-http-client/', 'axios/', 'node-fetch/', 'postman']
  const lowerAgent = userAgent.toLowerCase()
  if (suspiciousAgents.some((p) => lowerAgent.includes(p))) {
    logSuspicious('Suspicious user-agent detected', meta)
    return false
  }

  // Must have origin or referer for unsafe methods
  if (!origin && !referer) {
    logSuspicious('Missing both origin and referer', meta)
    return false
  }

  // Validate origin (strict equality)
  if (origin && !isAllowedOrigin(origin)) {
    logSuspicious('Invalid origin', meta)
    return false
  }

  // Validate referer (compare its origin)
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

  // Content-Type validation (relaxed, but blocks clearly weird stuff)
  // NOTE: Some POSTs may omit content-type (e.g., fetch with no body).
  if (contentType) {
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

/**
 * Wrapper for Next.js Route Handlers.
 * Use this only on mutating endpoints (POST/PUT/PATCH/DELETE).
 */
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
