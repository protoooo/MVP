// lib/captchaVerification.js - Server-side reCAPTCHA verification
import { logger } from './logger'

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

// Minimum score for reCAPTCHA v3 (0.0 = bot, 1.0 = human)
const MIN_SCORE = 0.5

/**
 * Verify reCAPTCHA token with Google
 * @param {string} token - reCAPTCHA token from client
 * @param {string} action - Expected action name
 * @param {string} remoteIp - Optional: User's IP address
 * @returns {Promise<{success: boolean, score?: number, error?: string}>}
 */
export async function verifyCaptcha(token, action = 'submit', remoteIp = null) {
  // Skip in development if not configured
  if (!RECAPTCHA_SECRET_KEY) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('reCAPTCHA not configured, skipping in development')
      return { success: true, score: 1.0, bypass: true }
    }
    logger.error('reCAPTCHA secret key not configured')
    return { success: false, error: 'CAPTCHA not configured' }
  }

  if (!token) {
    logger.security('CAPTCHA verification failed: missing token')
    return { success: false, error: 'CAPTCHA token required' }
  }

  try {
    const params = new URLSearchParams({
      secret: RECAPTCHA_SECRET_KEY,
      response: token,
    })

    if (remoteIp) {
      params.append('remoteip', remoteIp)
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      logger.error('reCAPTCHA API error', { status: response.status })
      return { success: false, error: 'CAPTCHA verification failed' }
    }

    const data = await response.json()

    // Log verification attempt
    logger.info('CAPTCHA verification', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    })

    // Check if verification was successful
    if (!data.success) {
      logger.security('CAPTCHA verification failed', { 
        errorCodes: data['error-codes'] 
      })
      return { 
        success: false, 
        error: 'CAPTCHA verification failed',
        errorCodes: data['error-codes']
      }
    }

    // Check if action matches
    if (data.action !== action) {
      logger.security('CAPTCHA action mismatch', {
        expected: action,
        received: data.action
      })
      return { 
        success: false, 
        error: 'CAPTCHA action mismatch' 
      }
    }

    // Check score (v3 only)
    if (typeof data.score === 'number') {
      if (data.score < MIN_SCORE) {
        logger.security('CAPTCHA score too low', { 
          score: data.score, 
          minScore: MIN_SCORE,
          action 
        })
        return { 
          success: false, 
          score: data.score,
          error: 'CAPTCHA score too low - possible bot activity' 
        }
      }
    }

    // Success
    return {
      success: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      timestamp: data.challenge_ts
    }

  } catch (error) {
    logger.error('CAPTCHA verification exception', { 
      error: error.message 
    })
    return { 
      success: false, 
      error: 'CAPTCHA verification error' 
    }
  }
}

/**
 * Middleware-style wrapper for API routes
 * Usage: const captchaResult = await requireCaptcha(request, 'login')
 */
export async function requireCaptcha(request, action = 'submit') {
  try {
    const body = await request.json()
    const token = body.captchaToken

    if (!token) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ error: 'CAPTCHA token required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')

    const result = await verifyCaptcha(token, action, ip)

    if (!result.success) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ 
            error: result.error || 'CAPTCHA verification failed',
            code: 'CAPTCHA_FAILED'
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return {
      valid: true,
      score: result.score,
      body // Return parsed body for convenience
    }

  } catch (error) {
    logger.error('requireCaptcha exception', { error: error.message })
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
