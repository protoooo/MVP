// lib/csrfProtection.js
import { headers } from 'next/headers'
import crypto from 'crypto'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf_token'

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCSRF(request) {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL
  
  // Basic origin/referer check
  if (origin && origin !== allowedOrigin) {
    console.error('[CSRF] Invalid origin:', origin)
    return false
  }
  
  if (referer && !referer.startsWith(allowedOrigin)) {
    console.error('[CSRF] Invalid referer:', referer)
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
