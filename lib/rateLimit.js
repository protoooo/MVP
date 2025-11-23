const RATE_LIMITS = new Map()

const LIMITS = {
  chat: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  image: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
  auth: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
  }
}

export async function checkRateLimit(userId, action = 'chat') {
  const key = `${userId}:${action}`
  const now = Date.now()
  const limits = LIMITS[action] || LIMITS.chat
  const { maxRequests, windowMs } = limits

  let userLimits = RATE_LIMITS.get(key)

  if (!userLimits || now > userLimits.resetTime) {
    userLimits = {
      count: 0,
      resetTime: now + windowMs,
      firstRequest: now
    }
    RATE_LIMITS.set(key, userLimits)
  }

  if (userLimits.count >= maxRequests) {
    const retryAfter = Math.ceil((userLimits.resetTime - now) / 1000)
    
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: userLimits.resetTime,
      retryAfter,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds.`
    }
  }

  userLimits.count++
  RATE_LIMITS.set(key, userLimits)

  if (Math.random() < 0.01) {
    cleanup()
  }

  return {
    allowed: true,
    remainingRequests: maxRequests - userLimits.count,
    resetTime: userLimits.resetTime,
    retryAfter: 0
  }
}

function cleanup() {
  const now = Date.now()
  for (const [key, value] of RATE_LIMITS.entries()) {
    if (now > value.resetTime) {
      RATE_LIMITS.delete(key)
    }
  }
}

export function resetRateLimit(userId, action = 'chat') {
  const key = `${userId}:${action}`
  RATE_LIMITS.delete(key)
}
