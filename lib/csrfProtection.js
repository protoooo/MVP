// lib/csrfProtection.js
import { headers } from 'next/headers'
import crypto from 'crypto'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_BASE_URL,
  'https://protocollm.org',
  'https://www.protocollm.org'
].filter(Boolean)

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCSRF(request) {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  const host = headersList.get('host')
  
  // Check for suspicious patterns
  const userAgent = headersList.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    console.error('[CSRF] Suspicious: Missing or invalid user agent')
    return false
  }
  
  // Validate origin
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed)
    if (!isAllowed) {
      console.error('[CSRF] Invalid origin:', origin)
      return false
    }
  }
  
  // Validate referer
  if (referer) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))
    if (!isAllowed) {
      console.error('[CSRF] Invalid referer:', referer)
      return false
    }
  }
  
  // If neither origin nor referer, that's suspicious
  if (!origin && !referer) {
    console.error('[CSRF] Suspicious: No origin or referer header')
    return false
  }
  
  return true
}

export function requireCSRF(handler) {
  return async (request, context) => {
    if (!validateCSRF(request)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request origin' }), 
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    return handler(request, context)
  }
}
