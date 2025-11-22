// lib/rateLimit.js
// Server-side rate limiting for API endpoints

const RATE_LIMITS = new Map()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of RATE_LIMITS.entries()) {
    if (now > value.resetTime) {
      RATE_LIMITS.delete(key)
    }
  }
}, 5 * 60 * 1000)

export const chatRateLimiter = {
  async checkLimit(userId, action) {
    const key = `${userId}:${action}`
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window
    const maxRequests = 10 // 10 requests per minute

    let userLimits = RATE_LIMITS.get(key)

    // Initialize or reset if window expired
    if (!userLimits || now > userLimits.resetTime) {
      userLimits = {
        count: 0,
        resetTime: now + windowMs
      }
      RATE_LIMITS.set(key, userLimits)
    }

    // Check if limit exceeded
    if (userLimits.count >= maxRequests) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: userLimits.resetTime
      }
    }

    // Increment counter
    userLimits.count++
    RATE_LIMITS.set(key, userLimits)

    return {
      allowed: true,
      remainingRequests: maxRequests - userLimits.count,
      resetTime: userLimits.resetTime
    }
  },

  // Reset limit for a specific user (useful for testing)
  resetLimit(userId, action) {
    const key = `${userId}:${action}`
    RATE_LIMITS.delete(key)
  }
}
