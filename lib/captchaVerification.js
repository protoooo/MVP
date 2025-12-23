// lib/captchaVerification.js - FIXED: Better production error handling
import { logger } from './logger'

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyCaptcha(token, action = 'submit', remoteIp = null) {
  // ✅ In production, CAPTCHA is mandatory
  if (!TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('Turnstile not configured in production')
      return { success: false, error: 'CAPTCHA configuration error' }
    }
    logger.warn('Turnstile not configured, bypassing in development')
    return { success: true, score: 1.0, bypass: true }
  }

  if (!token || token === 'turnstile_unavailable' || token === 'dev_bypass_token') {
    // ✅ FIXED: In production, reject invalid tokens immediately
    if (process.env.NODE_ENV === 'production') {
      logger.security('Invalid CAPTCHA token in production', { token: token?.substring(0, 20) })
      return { success: false, error: 'Invalid CAPTCHA token' }
    }
    // In development, allow bypass tokens
    logger.warn('CAPTCHA bypass token used in development')
    return { success: true, score: 1.0, bypass: true }
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
      
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'CAPTCHA verification unavailable' }
      }
      
      return { success: false, error: 'CAPTCHA verification failed' }
    }

    const data = await response.json()

    if (!data.success) {
      logger.security('CAPTCHA verification failed', { 
        errorCodes: data['error-codes'],
        action
      })
      return { 
        success: false, 
        error: 'CAPTCHA verification failed',
        errorCodes: data['error-codes']
      }
    }

    logger.info('CAPTCHA verification successful', {
      hostname: data.hostname,
      action
    })

    return {
      success: true,
      hostname: data.hostname,
      timestamp: data.challenge_ts
    }

  } catch (error) {
    logger.error('CAPTCHA verification exception', { 
      error: error.message,
      action
    })
    
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'CAPTCHA verification unavailable' }
    }
    
    return { 
      success: false, 
      error: 'CAPTCHA verification error' 
    }
  }
}
