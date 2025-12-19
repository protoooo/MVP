// lib/apiError.js - NEW FILE: Standardized error responses
import { NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * Standard API error codes
 */
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_SESSION: 'INVALID_SESSION',
  
  // Payment errors
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
  
  // Rate limiting
  RATE_LIMIT: 'RATE_LIMIT',
  USAGE_LIMIT: 'USAGE_LIMIT',
  
  // Security
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  CSRF_FAILED: 'CSRF_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // System
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TIMEOUT: 'TIMEOUT',
}

/**
 * Create standardized API error response
 * @param {string} message - User-friendly error message
 * @param {number} status - HTTP status code
 * @param {string} code - Error code from ERROR_CODES
 * @param {Object} meta - Optional metadata
 * @returns {NextResponse}
 */
export function apiError(message, status = 500, code = null, meta = {}) {
  const errorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...meta
  }
  
  // Log based on severity
  if (status >= 500) {
    logger.error('API Error', { status, code, message, ...meta })
  } else if (status === 429) {
    logger.warn('Rate limit hit', { code, message, ...meta })
  } else if (status >= 400) {
    logger.info('Client error', { status, code, message, ...meta })
  }
  
  return NextResponse.json(errorResponse, { status })
}

/**
 * Common error responses
 */
export const Errors = {
  // 401 Unauthorized
  unauthorized: (message = 'Authentication required') =>
    apiError(message, 401, ERROR_CODES.UNAUTHORIZED),
  
  invalidSession: (message = 'Session expired. Please sign in again.') =>
    apiError(message, 401, ERROR_CODES.INVALID_SESSION),
  
  emailNotVerified: (message = 'Please verify your email address') =>
    apiError(message, 403, ERROR_CODES.EMAIL_NOT_VERIFIED),
  
  // 403 Forbidden
  captchaFailed: (message = 'Security verification failed. Please try again.') =>
    apiError(message, 403, ERROR_CODES.CAPTCHA_FAILED),
  
  csrfFailed: (message = 'Invalid request origin') =>
    apiError(message, 403, ERROR_CODES.CSRF_FAILED),
  
  noSubscription: (message = 'Active subscription required') =>
    apiError(message, 403, ERROR_CODES.NO_SUBSCRIPTION),
  
  // 429 Rate Limiting
  rateLimit: (message = 'Too many requests. Please try again later.', retryAfter = 60) =>
    apiError(message, 429, ERROR_CODES.RATE_LIMIT, { retryAfter }),
  
  usageLimit: (message = 'Monthly usage limit reached') =>
    apiError(message, 429, ERROR_CODES.USAGE_LIMIT),
  
  // 400 Bad Request
  invalidInput: (message = 'Invalid input provided', details = null) =>
    apiError(message, 400, ERROR_CODES.INVALID_INPUT, details ? { details } : {}),
  
  // 500 Server Errors
  internalError: (message = 'An unexpected error occurred') =>
    apiError(message, 500, ERROR_CODES.INTERNAL_ERROR),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    apiError(message, 503, ERROR_CODES.SERVICE_UNAVAILABLE),
  
  timeout: (message = 'Request timed out') =>
    apiError(message, 504, ERROR_CODES.TIMEOUT),
}

/**
 * Wrap async route handlers with error catching
 * @param {Function} handler - Async route handler
 * @returns {Function}
 */
export function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      logger.error('Unhandled route error', {
        error: error.message,
        stack: error.stack,
        url: request.url
      })
      
      // Check for specific error types
      if (error.message === 'TIMEOUT') {
        return Errors.timeout()
      }
      
      if (error.code === 'CAPTCHA_FAILED') {
        return Errors.captchaFailed()
      }
      
      // Default to internal error
      return Errors.internalError()
    }
  }
}


// EXAMPLE USAGE in app/api/chat/route.js:
// Replace this:
//   return NextResponse.json({ error: 'Server error' }, { status: 500 })
//
// With this:
//   return Errors.internalError('Failed to process request')
//
// Or use the wrapper:
//   export const POST = withErrorHandling(async (request) => {
//     // Your code here
//   })
