// lib/csrfProtection.js - Enhanced CSRF protection (Production Ready)
import { headers } from 'next/headers'
import crypto from 'crypto'
import { logger } from './logger'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_BASE_URL,
  'https://protocollm.org',
  'https://www.protocollm.org',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean)

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCSRF(request) {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  const userAgent = headersList.get('user-agent')
  const contentType = headersList.get('content-type')
  
  const logSuspicious = (reason, details = {}) => {
    logger.security(`CSRF validation failed: ${reason}`, {
      origin,
      referer,
      userAgent: userAgent?.substring(0, 100),
      ...details
    })
  }
  
  // Check for suspicious patterns
  if (!userAgent || userAgent.length < 10) {
    logSuspicious('Missing or invalid user agent')
    return false
  }
  
  // Block known bot patterns
  const suspiciousAgents = [
    'curl/', 'wget/', 'python-requests/', 'go-http-client/',
    'axios/', 'node-fetch/', 'postman'
  ]
  
  const lowerAgent = userAgent.toLowerCase()
  if (suspiciousAgents.some(pattern => lowerAgent.includes(pattern))) {
    logSuspicious('Suspicious user agent detected', { agent: userAgent.substring(0, 50) })
    return false
  }
  
  // Validate origin
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed)
    if (!isAllowed) {
      logSuspicious('Invalid origin', { origin })
      return false
    }
  }
  
  // Validate referer
  if (referer) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))
    if (!isAllowed) {
      logSuspicious('Invalid referer', { referer })
      return false
    }
  }
  
  // Require either origin or referer for POST requests
  if (!origin && !referer) {
    logSuspicious('Missing both origin and referer')
    return false
  }
  
  // Content-Type validation (relaxed for file uploads)
  if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
    logSuspicious('Unexpected content type', { contentType })
    return false
  }
  
  return true
}

export function requireCSRF(handler) {
  return async (request, context) => {
    if (!validateCSRF(request)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request origin',
          code: 'CSRF_VALIDATION_FAILED'
        }), 
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    return handler(request, context)
  }
}
