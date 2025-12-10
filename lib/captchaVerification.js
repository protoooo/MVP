// lib/captchaVerification.js - Cloudflare Turnstile version
import { logger } from './logger'

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyCaptcha(token, action = 'submit', remoteIp = null) {
  if (!TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Turnstile not configured, skipping in development')
      return { success: true, score: 1.0, bypass: true }
    }
    logger.error('Turnstile secret key not configured')
    return { success: false, error: 'CAPTCHA not configured' }
  }

  if (!token) {
    logger.security('CAPTCHA verification failed: missing token')
    return { success: false, error: 'CAPTCHA token required' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', TURNSTILE_SECRET_KEY)
    formData.append('response', token)
    if (remoteIp) {
      formData.append('remoteip', remoteIp)
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      logger.error('Turnstile API error', { status: response.status })
      return { success: false, error: 'CAPTCHA verification failed' }
    }

    const data = await response.json()

    logger.info('CAPTCHA verification', {
      success: data.success,
      hostname: data.hostname,
    })

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

    return {
      success: true,
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
      body
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
