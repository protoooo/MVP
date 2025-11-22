// lib/redis-rate-limit.js
const Redis = require('ioredis')

let redis = null

function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        }
      })
      
      redis.on('error', (err) => {
        console.error('Redis Client Error:', err)
      })
    } catch (error) {
      console.error('Failed to initialize Redis:', error)
      redis = null
    }
  }
  return redis
}

async function checkRateLimit(userId, action = 'chat') {
  const client = getRedis()
  
  if (!client) {
    console.warn('Redis unavailable, using in-memory rate limiting')
    return fallbackRateLimit(userId, action)
  }

  const limits = {
    chat: { max: 20, window: 60 },
    image: { max: 5, window: 60 },
    auth: { max: 5, window: 300 }
  }

  const { max, window } = limits[action] || limits.chat
  const key = `rate:${userId}:${action}`

  try {
    const current = await client.incr(key)
    
    if (current === 1) {
      await client.expire(key, window)
    }
    
    const ttl = await client.ttl(key)
    const resetTime = Date.now() + (ttl * 1000)

    return {
      allowed: current <= max,
      remainingRequests: Math.max(0, max - current),
      resetTime,
      retryAfter: ttl
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return fallbackRateLimit(userId, action)
  }
}

const memoryStore = new Map()

function fallbackRateLimit(userId, action) {
  const limits = { chat: { max: 20, window: 60000 } }
  const { max, window } = limits[action] || limits.chat
  const key = `${userId}:${action}`
  const now = Date.now()
  
  let userLimit = memoryStore.get(key)
  
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = { count: 0, resetTime: now + window }
    memoryStore.set(key, userLimit)
  }
  
  if (userLimit.count >= max) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: userLimit.resetTime,
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    }
  }
  
  userLimit.count++
  memoryStore.set(key, userLimit)
  
  return {
    allowed: true,
    remainingRequests: max - userLimit.count,
    resetTime: userLimit.resetTime,
    retryAfter: 0
  }
}

function resetRateLimit(userId, action = 'chat') {
  const client = getRedis()
  if (client) {
    const key = `rate:${userId}:${action}`
    return client.del(key)
  }
  memoryStore.delete(`${userId}:${action}`)
}

module.exports = {
  checkRateLimit,
  resetRateLimit
}
