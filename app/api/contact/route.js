// app/api/contact/route.js - FIXED: support@protocollm.org
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyCaptcha } from '@/lib/captchaVerification'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SUPPORT_EMAIL = 'protocolLM <support@protocollm.org>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'austinrnorthrop@gmail.com'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { name, email, subject, message, captchaToken } = await request.json()

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Verify CAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken, 'contact')
    if (!captchaResult.success) {
      return NextResponse.json({ error: 'Security verification failed' }, { status: 403 })
    }

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: SUPPORT_EMAIL,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `[Contact Form] ${subject}`,
        html: `
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      })
    })

    if (!res.ok) {
      logger.error('Failed to send contact email')
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    logger.audit('Contact form submitted', { from: email.substring(0, 3) + '***' })
    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Contact form error', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
