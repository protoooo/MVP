import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org/auth'

export const dynamic = 'force-dynamic'

const emailConfigured = Boolean(RESEND_API_KEY)

function maskEmail(email = '') {
  const [name, domain] = email.split('@')
  if (!name || !domain) return '***'
  const safeName = name.length <= 2 ? `${name[0] ?? '*'}*` : `${name.slice(0, 2)}***`
  return `${safeName}@${domain}`
}

function isValidEmail(email = '') {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

async function sendEmail(to, subject, html, replyTo) {
  if (!emailConfigured) {
    logger.warn('Email service not configured, skipping send', { to: maskEmail(to), subject })
    return { success: true, skipped: true }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'protocolLM <support@protocollm.org>',
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    logger.error('Failed to send trial email', { to: maskEmail(to), data })
    return { success: false, error: data?.error || 'Email send failed' }
  }

  return { success: true, id: data?.id }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body?.email || '').trim().toLowerCase()
    const visitorId = body?.visitorId || 'unknown'

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required to start your trial.' }, { status: 400 })
    }

    const welcomeLink = APP_URL

    const welcomeHtml = `
      <p>Thanks for starting your 30-day protocolLM trial.</p>
      <p><strong>Access the app instantly:</strong> <a href="${welcomeLink}">${welcomeLink}</a></p>
      <p>No credit card required. Unlimited photo scans during your trial.</p>
    `

    const adminHtml = `
      <p>New 30-day trial signup.</p>
      <ul>
        <li>Email: ${email}</li>
        <li>Visitor ID: ${visitorId}</li>
        <li>Source: landing-page</li>
      </ul>
    `

    const welcomeResult = await sendEmail(email, 'Your 30-day protocolLM trial', welcomeHtml)
    if (!welcomeResult.success) {
      return NextResponse.json({ error: 'Unable to send welcome email right now.' }, { status: 500 })
    }

    if (ADMIN_EMAIL) {
      await sendEmail(ADMIN_EMAIL, 'New protocolLM trial signup', adminHtml, emailConfigured ? email : undefined)
    } else {
      logger.warn('ADMIN_EMAIL not configured; skipped admin trial notification', { email: maskEmail(email), visitorId })
    }

    logger.audit('trial_signup', { email: maskEmail(email), visitorId })

    return NextResponse.json({ success: true, appUrl: welcomeLink })
  } catch (error) {
    logger.error('trial_signup_error', { error: error?.message })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
