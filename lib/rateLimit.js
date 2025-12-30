// lib/rateLimit.js - Production-ready rate limiting middleware

/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, use Redis or Upstash
 */

const rateLimit = new Map()

// Configuration per endpoint
const LIMITS = {
  '/api/qa': {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  },
  '/api/image/analyze': {
    windowMs: 60 * 1000,
    max: 3, // 3 image analyses per minute (prevent abuse even with payment)
  },
  '/api/video/analyze': {
    windowMs: 60 * 1000,
    max: 2, // 2 video analyses per minute
  },
  '/api/payment/create': {
    windowMs: 60 * 1000,
    max: 10,
  },
  '/api/pdf/generate': {
    windowMs: 60 * 1000,
    max: 5,
  },
  default: {
    windowMs: 60 * 1000,
    max: 20,
  }
}

/**
 * Get client identifier from request
 * Priority: passcode > IP address
 */
function getClientId(request) {
  // Try to get passcode from body or query
  const url = new URL(request.url)
  const passcode = url.searchParams.get('passcode')
  
  if (passcode) {
    return `passcode:${passcode}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  
  return `ip:${ip}`
}

/**
 * Rate limiter middleware
 * @param {Request} request - Next.js request object
 * @param {string} endpoint - API endpoint path (e.g., '/api/qa')
 * @returns {Object} { success: boolean, remaining: number, reset: number }
 */
export function checkRateLimit(request, endpoint) {
  const config = LIMITS[endpoint] || LIMITS.default
  const clientId = getClientId(request)
  const key = `${endpoint}:${clientId}`
  const now = Date.now()

  // Get or create client record
  let record = rateLimit.get(key)

  if (!record || now - record.resetTime > config.windowMs) {
    // New window
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    }
    rateLimit.set(key, record)
  }

  // Check limit
  if (record.count >= config.max) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((record.resetTime - now) / 1000),
      limit: config.max,
    }
  }

  // Increment counter
  record.count++

  return {
    success: true,
    remaining: config.max - record.count,
    reset: Math.ceil((record.resetTime - now) / 1000),
    limit: config.max,
  }
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse() {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Please try again later',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    }
  )
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(response, rateLimit) {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimit.reset))
  return response
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanupRateLimitCache() {
  const now = Date.now()
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetTime + 60000) { // 1 minute grace period
      rateLimit.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitCache, 5 * 60 * 1000)
}
