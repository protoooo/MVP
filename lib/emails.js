// lib/emails.js - Complete transactional email system with Resend
// All emails use support@protocollm.org

import { logger } from './logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'protocolLM <support@protocollm.org>'
const SUPPORT_EMAIL = 'support@protocollm.org'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org'

// ✅ Pricing constants (single source of truth for copy)
const PRICE_MONTHLY = Number(process.env.PROTOCOLLM_PRICE_MONTHLY || 50)
const PRICE_RANGE_LOW = Number(process.env.PROTOCOLLM_FINE_RANGE_LOW || 200)
const PRICE_RANGE_HIGH = Number(process.env.PROTOCOLLM_FINE_RANGE_HIGH || 500)

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function escapeHtml(input) {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Base email sender
async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    logger.error('RESEND_API_KEY not configured - email not sent', { to, subject })
    return { success: false, error: 'Email not configured' }
  }

  const toList = Array.isArray(to) ? to : [to]

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toList,
        subject,
        html,
        reply_to: replyTo || SUPPORT_EMAIL,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      logger.error('Email send failed', { error: data, to: toList, subject })
      return { success: false, error: data }
    }

    logger.info('Email sent', { to: toList, subject, id: data.id })
    return { success: true, id: data.id }
  } catch (error) {
    logger.error('Email exception', { error: error?.message, to: toList, subject })
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// Email template wrapper (consistent styling)
function emailTemplate({ title, preheader, content, ctaText, ctaUrl, footerNote }) {
  const safeTitle = escapeHtml(title)
  const safePreheader = preheader ? escapeHtml(preheader) : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  ${safePreheader ? `<meta name="description" content="${safePreheader}">` : ''}
  <title>${safeTitle}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 20px 16px !important; }
      .mobile-text { font-size: 14px !important; line-height: 1.5 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  
  ${safePreheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${safePreheader}</div>` : ''}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                protocol<span style="font-weight: 900;">LM</span>
              </h1>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.02em;">
                Food Safety Compliance • Michigan
              </p>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>

          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding: 0 32px 40px 32px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; background-color: #0f172a; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.01em;">
                ${escapeHtml(ctaText)}
              </a>
            </td>
          </tr>
          ` : ''}

          ${footerNote ? `
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center;">
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                      ${footerNote}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0;">
                Questions? Reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                protocolLM • Made in Michigan for Michigan
              </p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0 0;">
                <a href="${APP_URL}/privacy" style="color: #94a3b8; text-decoration: none; margin: 0 8px;">Privacy Policy</a> • 
                <a href="${APP_URL}/terms" style="color: #94a3b8; text-decoration: none; margin: 0 8px;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const emails = {
  // --------------------------------------------------------------------------
  // 1. TRIAL STARTED (Day 0) - Welcome email
  // --------------------------------------------------------------------------
  trialStarted: async (userEmail, userName) => {
    const safeName = escapeHtml(userName || 'there')
    const subject = 'Welcome to protocolLM - Get started with inspection reports'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your account is now active! You can purchase inspection reports for $149 each to analyze your restaurant videos.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              Get Started in 3 Steps
            </h3>
            
            <div style="margin-bottom: 16px;">
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">1</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Take a Photo</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  Snap a picture of your walk-in cooler, prep station, or dish area. Upload it and get instant violation checks.
                </p>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">2</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Ask Questions</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  Type any food safety question like "Can lettuce go above raw chicken?" Get answers backed by Michigan regulations.
                </p>
              </div>
            </div>

            <div>
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">3</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Make It a Habit</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  Run quick checks before inspection windows (9am-2pm weekdays) and after training new staff. Takes 30 seconds.
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        Questions? Just reply to this email—I'm here to help.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Welcome to protocolLM',
      preheader: 'Your account is active. Purchase inspection reports to get started.',
      content,
      ctaText: 'Open protocolLM',
      ctaUrl: APP_URL,
      footerNote: '💰 $149 per inspection report. Up to 1 hour of video processing included.',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 2. TRIAL DAY 5 - Engagement check-in
  // --------------------------------------------------------------------------
  trialMidpoint: async (userEmail, userName) => {
    const safeName = escapeHtml(userName || 'there')
    const subject = "How's your trial going?"

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        You're halfway through your protocolLM trial. How's it going?
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        I wanted to check in and see if you have any questions. Here are a few tips from other Michigan restaurants:
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px; margin-bottom: 12px;">
            <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 4px;">💡 Pro Tip #1</strong>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
              Take photos at the START of your shift when everything looks good. This creates a baseline for training new staff.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px; margin-bottom: 12px;">
            <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 4px;">💡 Pro Tip #2</strong>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
              Health inspectors usually visit between 9am-2pm. Run a quick scan before this window opens.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px;">
            <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 4px;">💡 Pro Tip #3</strong>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
              Use the document search to settle debates. "Do we need to label prep containers?" Answer in 10 seconds.
            </p>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Got questions or feedback? Just reply—I read every email.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Austin
      </p>
    `

    const html = emailTemplate({
      title: "How's your trial going?",
      preheader: 'Tips from other Michigan restaurants',
      content,
      ctaText: 'Open protocolLM',
      ctaUrl: APP_URL,
      footerNote: '⏰ 9 days left in your trial',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 3. TRIAL DAY 10/14 - Ending soon reminder
  // --------------------------------------------------------------------------
  trialEndingSoon: async (userEmail, userName, daysLeft) => {
    const safeName = escapeHtml(userName || 'there')
    const safeDaysLeft = Number.isFinite(Number(daysLeft)) ? Number(daysLeft) : 0

    const subject =
      safeDaysLeft === 0
        ? 'Your trial ends today'
        : `Your trial ends in ${safeDaysLeft} day${safeDaysLeft > 1 ? 's' : ''}`

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        ${
          safeDaysLeft === 0
            ? 'Your protocolLM trial ends <strong>today</strong>.'
            : `Just a heads up—your protocolLM trial ends in <strong>${safeDaysLeft} day${safeDaysLeft > 1 ? 's' : ''}</strong>.`
        }
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 8px; margin: 24px 0;">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">
              Keep catching violations before the inspector
            </p>
            <p style="color: rgba(255,255,255,0.8); font-size: 32px; font-weight: 700; margin: 0 0 8px 0;">
              $${PRICE_MONTHLY}/month
            </p>
            <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">
              Cancel anytime • No long-term contract
            </p>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        To keep using protocolLM after your trial, subscribe for $${PRICE_MONTHLY}/month. That's <strong>less than one avoided violation fine</strong> ($${PRICE_RANGE_LOW}-${PRICE_RANGE_HIGH}).
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Questions before subscribing? Just reply to this email.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Austin
      </p>
    `

    const html = emailTemplate({
      title: 'Your trial ends soon',
      preheader: safeDaysLeft === 0 ? 'Last chance to subscribe' : `Only ${safeDaysLeft} day${safeDaysLeft > 1 ? 's' : ''} left`,
      content,
      ctaText: 'Subscribe Now',
      ctaUrl: APP_URL,
      footerNote:
        safeDaysLeft === 0
          ? '⚠️ Trial ends today. Subscribe to keep access.'
          : `⏰ Trial ends in ${safeDaysLeft} day${safeDaysLeft > 1 ? 's' : ''}. Subscribe to keep access.`,
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 4. PAYMENT FAILED - Urgent action required
  // --------------------------------------------------------------------------
  paymentFailed: async (userEmail, userName, attemptCount = 1) => {
    const safeName = escapeHtml(userName || 'there')
    const tries = Number.isFinite(Number(attemptCount)) ? Number(attemptCount) : 1
    const isUrgent = tries >= 3

    const subject = isUrgent ? '⚠️ Payment failed - Update your card now' : "Payment failed - We'll retry soon"

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${
          isUrgent
            ? "We couldn't process your payment for protocolLM after 3 attempts. <strong>Your access has been suspended.</strong>"
            : "We couldn't process your payment for protocolLM. We'll automatically retry in a few days."
        }
      </p>

      ${
        isUrgent
          ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0;">
              ⚠️ Update your payment method to restore access
            </p>
          </td>
        </tr>
      </table>
      `
          : ''
      }

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Common reasons for payment failure:
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        <li>Insufficient funds</li>
        <li>Expired card</li>
        <li>Card issuer declined the charge</li>
        <li>Incorrect billing information</li>
      </ul>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        ${
          isUrgent
            ? 'Update your card now to restore access.'
            : "No action needed—we'll try again automatically. But if you want to update your card now, click below."
        }
      </p>
    `

    const html = emailTemplate({
      title: 'Payment Failed',
      preheader: isUrgent ? 'Update your card to restore access' : "We'll retry your payment automatically",
      content,
      ctaText: 'Update Payment Method',
      ctaUrl: APP_URL,
      footerNote: isUrgent
        ? '⚠️ Access suspended. Update your card to continue using protocolLM.'
        : "We'll automatically retry your payment. No action needed.",
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 5. PAYMENT SUCCEEDED (after failure recovery)
  // --------------------------------------------------------------------------
  paymentSucceeded: async (userEmail, userName) => {
    const safeName = escapeHtml(userName || 'there')
    const subject = '✅ Payment successful - Access restored'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Good news! Your payment was successful and your protocolLM access has been restored.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #d1fae5; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="color: #065f46; font-size: 16px; font-weight: 600; margin: 0;">
              ✅ You're all set! Full access restored.
            </p>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        You can now continue using protocolLM to catch violations before the inspector does.
      </p>
    `

    const html = emailTemplate({
      title: 'Payment Successful',
      preheader: 'Your access has been restored',
      content,
      ctaText: 'Open protocolLM',
      ctaUrl: APP_URL,
      footerNote: '✅ Payment successful. Thank you for being a protocolLM customer!',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 6. SUBSCRIPTION CANCELED - Feedback request
  // --------------------------------------------------------------------------
  subscriptionCanceled: async (userEmail, userName) => {
    const safeName = escapeHtml(userName || 'there')
    const subject = 'Sorry to see you go'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Your protocolLM subscription has been canceled. You'll have access until the end of your current billing period.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Before you go, would you mind sharing why you canceled? Your feedback helps us improve for other Michigan restaurants.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        Just reply to this email and let me know. I read every message personally.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Thanks for trying protocolLM,<br>
        Austin
      </p>
    `

    const html = emailTemplate({
      title: 'Subscription Canceled',
      preheader: "We'd love to hear your feedback",
      content,
      footerNote: 'You can resubscribe anytime at protocollm.org',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 7. TRIAL ENDED - Trial expired without conversion
  // --------------------------------------------------------------------------
  trialEnded: async (userEmail, userName) => {
    const safeName = escapeHtml(userName || 'there')
    const subject = 'Your protocolLM trial has ended'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Your 14-day protocolLM trial has ended. We hope you found it useful for catching violations before the health inspector!
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        To continue using protocolLM, subscribe for just $${PRICE_MONTHLY}/month—less than the cost of a single Priority violation fine.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 8px; margin: 24px 0;">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">
              Keep catching violations early
            </p>
            <p style="color: white; font-size: 32px; font-weight: 700; margin: 0 0 8px 0;">
              $${PRICE_MONTHLY}/month
            </p>
            <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">
              Cancel anytime • No long-term contract
            </p>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        One avoided violation fine ($${PRICE_RANGE_LOW}-${PRICE_RANGE_HIGH}) pays for ${Math.max(
          1,
          Math.floor(PRICE_RANGE_LOW / PRICE_MONTHLY)
        )}-${Math.max(1, Math.floor(PRICE_RANGE_HIGH / PRICE_MONTHLY))} months of protocolLM.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        Questions? Just reply to this email.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Trial Ended',
      preheader: 'Subscribe to keep using protocolLM',
      content,
      ctaText: `Subscribe Now - $${PRICE_MONTHLY}/mo`,
      ctaUrl: APP_URL,
      footerNote: "💡 Need help deciding? Reply to this email and I'll answer any questions.",
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 8. LOCATION MANAGER INVITE - Sent to each manager with signup link
  // --------------------------------------------------------------------------
  locationManagerInvite: async (managerEmail, restaurantName, signupUrl, buyerEmail) => {
    const safeRestaurantName = escapeHtml(restaurantName || 'your location')
    const safeBuyerEmail = escapeHtml(buyerEmail || 'your manager')
    const safeSignupUrl = signupUrl

    const subject = `Your protocolLM account for ${safeRestaurantName}`

    const content = `
    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hi there,
    </p>

    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      ${safeBuyerEmail} has set up protocolLM for <strong>${safeRestaurantName}</strong> and added you as the location manager.
    </p>

    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      protocolLM helps catch health code violations before inspectors arrive - think of it as your 24/7 compliance assistant for Michigan.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">
          <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
            What You Can Do
          </h3>
          
          <div style="margin-bottom: 16px;">
            <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">1</div>
            <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
              <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Photo Scans</strong>
              <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                Take a photo of your cooler, prep area, or dish station. Get instant violation checks.
              </p>
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">2</div>
            <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
              <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Ask Questions</strong>
              <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                "Can raw chicken go above lettuce?" "How long can soup sit at room temp?" Get answers backed by county regulations.
              </p>
            </div>
          </div>

          <div>
            <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">3</div>
            <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
              <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Pre-Inspection Checks</strong>
              <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                Inspectors visit 9am-2pm weekdays. Run a quick scan before the window opens.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Click below to create your account (no payment needed - already covered):
    </p>
  `

    const html = emailTemplate({
      title: `Your protocolLM Account`,
      preheader: `Set up your account for ${safeRestaurantName}`,
      content,
      ctaText: `Create Account for ${safeRestaurantName}`,
      ctaUrl: safeSignupUrl,
      footerNote: '📍 This account is for ONE location only. Each location needs its own login credentials.',
    })

    return sendEmail({ to: managerEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 9. MULTI-LOCATION PURCHASE COMPLETE - Send signup links
  // --------------------------------------------------------------------------
  multiLocationPurchaseComplete: async (buyerEmail, buyerName, locationCount, devicesPerLocation, totalMonthly, signupLinks) => {
    const safeName = escapeHtml(buyerName || 'there')
    const count = Number.isFinite(Number(locationCount)) ? Math.max(1, Number(locationCount)) : 1
    const devices = Number.isFinite(Number(devicesPerLocation)) ? Math.max(1, Number(devicesPerLocation)) : 1
    const links = Array.isArray(signupLinks) ? signupLinks : []
    const tierPricingTotal = (() => {
      const tier = count >= 20 ? 'enterprise' : count >= 5 ? 'multi' : 'single'
      const pricePerLocation = tier === 'enterprise' ? 35 : tier === 'multi' ? 40 : 50
      const devicePrice = tier === 'single' ? 20 : 15
      const totalDevices = count * devices
      const additionalDevices = Math.max(0, totalDevices - count)
      return pricePerLocation * count + additionalDevices * devicePrice
    })()
    const computedTotal = Number.isFinite(Number(totalMonthly))
      ? Number(totalMonthly)
      : tierPricingTotal

    const subject = `Your ${count}-location protocolLM licenses are ready`

    const grouped = links.reduce((acc, link) => {
      const loc = link?.location || 1
      const device = link?.device || 1
      const url = link?.url ? String(link.url) : ''
      if (!acc[loc]) acc[loc] = []
      acc[loc].push({ device, url })
      return acc
    }, {})

    const linksHtml = Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .map((locKey) => {
        const deviceRows = grouped[locKey]
          .sort((a, b) => a.device - b.device)
          .map(
            (entry) => `
              <tr>
                <td style="padding: 10px 0; color: #475569; font-size: 14px;">
                  Device ${escapeHtml(entry.device)}
                </td>
                <td style="padding: 10px 0; text-align: right;">
                  <a href="${entry.url}" style="display: inline-block; padding: 8px 14px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    Create Account
                  </a>
                </td>
              </tr>
            `
          )
          .join('')

        return `
          <tr>
            <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 8px;">Location ${escapeHtml(locKey)}</strong>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${deviceRows}
              </table>
            </td>
          </tr>
        `
      })
      .join('')

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your multi-location protocolLM purchase is complete! Below are <strong>${count * devices}</strong> device signup links organized by location.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="color: #0f172a; font-size: 15px; margin: 0 0 6px 0;"><strong>Total locations:</strong> ${count}</p>
            <p style="color: #0f172a; font-size: 15px; margin: 0 0 6px 0;"><strong>Devices per location:</strong> ${devices}</p>
            <p style="color: #0f172a; font-size: 15px; margin: 0;"><strong>Monthly total:</strong> $${computedTotal}/month</p>
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              📍 Your Location + Device Signup Links
            </h3>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: white; border-radius: 6px; overflow: hidden;">
              ${linksHtml || `
                <tr>
                  <td style="padding: 14px; color: #475569; font-size: 14px;">
                    No signup links were provided. Please reply to this email and we’ll resend them.
                  </td>
                </tr>
              `}
            </table>
          </td>
        </tr>
      </table>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
          Important: One account per device
        </p>
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          Each signup link is unique to a device at a location. Share the correct Device 1/2/3 link with your managers so every device is registered separately.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>Next Steps:</strong>
      </p>
      <ol style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Forward each device link to the right manager at that location</li>
        <li style="margin-bottom: 8px;">Each manager creates their account (no payment needed)</li>
        <li style="margin-bottom: 8px;">Verify email and start using protocolLM immediately</li>
      </ol>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Your team is all set to catch violations before the health inspector!
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Questions? Just reply to this email.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 8px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Your Multi-Location Licenses',
      preheader: `${count * devices} device signup links ready - organized by location`,
      content,
      footerNote: `💳 Billing: $${computedTotal}/month for ${count} locations • ${devices} device(s) per location`,
    })

    return sendEmail({ to: buyerEmail, subject, html })
  },

  // ✅ Purchase confirmation email with access code
  async sendPurchaseConfirmation(customerEmail, customerName, accessCode, amountPaid, tier = 'BASIC', photoLimit = 200) {
    const subject = `Your protocolLM Access Code – Order Confirmation`
    
    const tierName = tier === 'PREMIUM' ? 'Premium' : 'Basic'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${escapeHtml(customerName)},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Thank you for your purchase! Your payment of <strong>$${amountPaid.toFixed(2)}</strong> has been received for the <strong>${tierName} Plan</strong>.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
          Your Access Code
        </p>
        <p style="color: #1e293b; font-size: 32px; font-weight: 700; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">
          ${escapeHtml(accessCode)}
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>What's included:</strong>
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Up to ${photoLimit} photos</li>
        <li style="margin-bottom: 8px;">Michigan food safety health code analysis</li>
        <li style="margin-bottom: 8px;">Detailed PDF compliance report</li>
        <li style="margin-bottom: 8px;">Photo-by-photo violation detection</li>
        <li style="margin-bottom: 8px;">Permanent access to your report</li>
      </ul>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>How to use your code:</strong>
      </p>
      <ol style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Go to <a href="${APP_URL}" style="color: #3b82f6; text-decoration: none;">${APP_URL.replace('https://', '')}</a></li>
        <li style="margin-bottom: 8px;">Enter your access code: <strong>${escapeHtml(accessCode)}</strong></li>
        <li style="margin-bottom: 8px;">Upload your restaurant photos (up to ${photoLimit})</li>
        <li style="margin-bottom: 8px;">Click "Process Report"</li>
        <li style="margin-bottom: 8px;">Download your compliance report</li>
      </ol>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Important:</strong> Your access code is valid for one-time use. After processing your report, you can still access and download it using this code, but you cannot process another batch of photos.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 16px 0;">
        <strong>Need help?</strong><br>
        Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6; text-decoration: none;">${SUPPORT_EMAIL}</a>
      </p>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <strong>Order Details:</strong><br>
        Product: ${tierName} Photo Analysis (${photoLimit} photos)<br>
        Amount Paid: $${amountPaid.toFixed(2)}<br>
        Access Code: ${escapeHtml(accessCode)}<br>
        Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
        <br>
        <em style="color: #94a3b8;">This is a non-refundable purchase. All sales are final.</em>
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
        Thanks for choosing protocolLM!<br>
        <br>
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Your Access Code',
      preheader: `Access code ${accessCode} – Start analyzing your restaurant photos`,
      content,
      footerNote: `Order total: $${amountPaid.toFixed(2)} • Non-refundable`,
    })

    return sendEmail({ to: customerEmail, subject, html })
  },

  // ✅ Access code retrieval email
  async sendAccessCodeRetrieval(customerEmail, customerName, accessCode, codeStatus) {
    const subject = `Your protocolLM Access Code`

    const statusText = codeStatus === 'unused' 
      ? 'Your access code is <strong>ready to use</strong>.'
      : 'Your access code has been <strong>used</strong>, but you can still access your report with it.'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${escapeHtml(customerName)},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Here's your protocolLM access code as requested:
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
          Your Access Code
        </p>
        <p style="color: #1e293b; font-size: 32px; font-weight: 700; letter-spacing: 2px; margin: 0; font-family: 'Courier New', monospace;">
          ${escapeHtml(accessCode)}
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${statusText}
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>How to use your code:</strong>
      </p>
      <ol style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Go to <a href="${APP_URL}" style="color: #3b82f6; text-decoration: none;">${APP_URL.replace('https://', '')}</a></li>
        <li style="margin-bottom: 8px;">Enter your access code: <strong>${escapeHtml(accessCode)}</strong></li>
        ${codeStatus === 'unused' 
          ? `<li style="margin-bottom: 8px;">Upload your restaurant walkthrough video (up to 1 hour)</li>
        <li style="margin-bottom: 8px;">Wait for processing to complete</li>
        <li style="margin-bottom: 8px;">Download your compliance report</li>`
          : `<li style="margin-bottom: 8px;">View and download your compliance report</li>`
        }
      </ol>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Keep this email safe!</strong> You'll need your access code to view your reports. If you lose it again, you can request it at any time.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 16px 0;">
        <strong>Need help?</strong><br>
        Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6; text-decoration: none;">${SUPPORT_EMAIL}</a>
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Your Access Code',
      preheader: `Access code ${accessCode} – Retrieved per your request`,
      content,
    })

    return sendEmail({ to: customerEmail, subject, html })
  },

  // ✅ Inspection reminder email (sent in March and September)
  async sendInspectionReminder(customerEmail, customerName, unsubscribeToken, season) {
    const seasonText = season === 'spring' ? 'Spring' : 'Fall'
    const subject = `${seasonText} Inspection Season is Here – Time for a Fresh Scan? 🔍`

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${escapeHtml(customerName)},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Just a friendly heads-up: <strong>${seasonText.toLowerCase()} inspection season</strong> is here! Health inspectors in Michigan typically ramp up visits between now and the next few weeks.
      </p>

      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">
          🗓️ Peak Inspection Window
        </p>
        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0; line-height: 1.6;">
          Inspectors usually visit between <strong>9am–2pm on weekdays</strong><br>
          Most inspections happen in the next 4-6 weeks
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>Quick tips to prepare:</strong>
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Run a fresh video scan of your walk-in coolers, prep areas, and dish stations</li>
        <li style="margin-bottom: 8px;">Check temperature logs and food labeling</li>
        <li style="margin-bottom: 8px;">Review any previous violations or notes</li>
        <li style="margin-bottom: 8px;">Make sure staff knows the basics (handwashing, cross-contamination, etc.)</li>
      </ul>

      <div style="background-color: #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #065f46; font-size: 15px; line-height: 1.6; margin: 0;">
          <strong>💡 Pro tip:</strong> Most violations are easy fixes if you catch them early. A quick 30-second scan with protocolLM can save you $200-$500 in fines.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Want to run a pre-inspection check? We're here to help catch issues before the inspector does.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
        Good luck this season!<br>
        <br>
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: `${seasonText} Inspection Season`,
      preheader: 'Time for a fresh compliance scan before inspectors arrive',
      content,
      ctaText: 'Run a Fresh Scan',
      ctaUrl: APP_URL,
      footerNote: `<a href="${APP_URL}/api/notification-preferences/unsubscribe?token=${unsubscribeToken}" style="color: #94a3b8; text-decoration: none;">Unsubscribe from inspection reminders</a>`,
    })

    return sendEmail({ to: customerEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 10. API KEY DELIVERY - Send API key to customer after purchase
  // --------------------------------------------------------------------------
  apiKeyDelivery: async (customerEmail, customerName, apiKey, credits, tier, expiresAt) => {
    const safeName = escapeHtml(customerName || 'there')
    const safeApiKey = escapeHtml(apiKey)
    const safeCredits = Number(credits) || 0
    const safeTier = escapeHtml(tier || 'starter')
    const subject = 'Your protocolLM API Key - Ready to Use'

    // Format tier name
    const tierNames = {
      'starter': 'Starter Pack (1,000 images)',
      'pro': 'Pro Pack (10,000 images)',
      'enterprise': 'Enterprise Pack (100,000 images)',
      'growth': 'Growth Subscription (3,000 images/month)',
      'chain': 'Chain Subscription (20,000 images/month)',
      'enterprise_sub': 'Enterprise Subscription (Unlimited)'
    }
    const tierName = tierNames[safeTier] || safeTier

    // Format expiration date
    let expirationText = ''
    if (expiresAt) {
      const expiryDate = new Date(expiresAt)
      expirationText = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Thank you for your purchase! Your protocolLM API key is ready to use. You now have <strong>${safeCredits.toLocaleString()} image credits</strong> for the ${tierName}.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
          Your API Key
        </p>
        <p style="color: #1e293b; font-size: 18px; font-weight: 700; letter-spacing: 1px; margin: 0; font-family: 'Courier New', monospace; word-break: break-all;">
          ${safeApiKey}
        </p>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
          🔒 Keep this key secure
        </p>
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          Your API key is like a password. Never commit it to public repositories or share it publicly. Store it as an environment variable in your application.
        </p>
      </div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              Quick Start Guide
            </h3>
            
            <div style="margin-bottom: 16px;">
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">1</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Include API Key in Requests</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  Add the header <code style="background: white; padding: 2px 6px; border-radius: 3px; font-family: monospace;">X-Api-Key: ${safeApiKey.substring(0, 15)}...</code> to all API requests
                </p>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">2</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Send Images for Analysis</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  POST to <code style="background: white; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${APP_URL}/api/audit-photos</code> with your image URLs or files
                </p>
              </div>
            </div>

            <div>
              <div style="display: inline-block; width: 32px; height: 32px; background-color: #0f172a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 12px; vertical-align: top;">3</div>
              <div style="display: inline-block; width: calc(100% - 48px); vertical-align: top;">
                <strong style="color: #0f172a; font-size: 15px; display: block; margin-bottom: 4px;">Get Compliance Results</strong>
                <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                  Receive JSON response with violations, scores, and Michigan Food Code citations
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>Example cURL Request:</strong>
      </p>
      
      <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 0 0 24px 0; overflow-x: auto;">
        <pre style="color: #e2e8f0; font-size: 13px; margin: 0; font-family: 'Courier New', monospace; white-space: pre-wrap; word-break: break-word;">curl -X POST ${APP_URL}/api/audit-photos \\
  -H "X-Api-Key: ${safeApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "images": ["https://example.com/kitchen.jpg"],
    "location": "kitchen"
  }'</pre>
      </div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="color: #0f172a; font-size: 15px; margin: 0 0 6px 0;"><strong>Credits:</strong> ${safeCredits.toLocaleString()} images</p>
            <p style="color: #0f172a; font-size: 15px; margin: 0 0 6px 0;"><strong>Plan:</strong> ${tierName}</p>
            ${expirationText ? `<p style="color: #0f172a; font-size: 15px; margin: 0;"><strong>Valid until:</strong> ${expirationText}</p>` : ''}
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>Resources:</strong>
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;"><a href="${APP_URL}/api-documentation" style="color: #3b82f6; text-decoration: none;">Full API Documentation</a></li>
        <li style="margin-bottom: 8px;"><a href="${APP_URL}/examples" style="color: #3b82f6; text-decoration: none;">Code Examples (JavaScript, Python, cURL)</a></li>
        <li style="margin-bottom: 8px;">Reply to this email for integration support</li>
      </ul>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Need help getting started? Just reply to this email and I'll personally assist with your integration.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Your API Key is Ready',
      preheader: `${safeCredits.toLocaleString()} image credits ready to use`,
      content,
      ctaText: 'View API Documentation',
      ctaUrl: `${APP_URL}/api-documentation`,
      footerNote: `🔑 Keep your API key secure. Need help? Reply to this email anytime.`,
    })

    return sendEmail({ to: customerEmail, subject, html })
  },

  // ✅ Regulation update email (manual trigger)
  async sendRegulationUpdate(customerEmail, customerName, updateTitle, updateDescription, updateDetails, unsubscribeToken) {
    const subject = `Michigan Modified Food Code Update: ${updateTitle}`

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${escapeHtml(customerName)},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        There's an important update to Michigan's food safety regulations we wanted you to know about:
      </p>

      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
          What Changed
        </p>
        <p style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">
          ${escapeHtml(updateTitle)}
        </p>
        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0; line-height: 1.6;">
          ${escapeHtml(updateDescription)}
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>What this means for you:</strong>
      </p>
      <div style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0;">
        ${updateDetails}
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>Action needed:</strong> Review your current practices to ensure compliance with the new requirements. Inspectors may start checking for these changes in upcoming visits.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Have questions about how this affects your establishment? Reply to this email and I'll help clarify.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
        Austin Northrop<br>
        <span style="color: #64748b; font-size: 14px;">Founder, protocolLM</span>
      </p>
    `

    const html = emailTemplate({
      title: 'Michigan Food Code Update',
      preheader: updateDescription,
      content,
      ctaText: 'View Full Regulations',
      ctaUrl: 'https://www.michigan.gov/mdhhs/keep-mi-healthy/chronicdiseases/foodsafety',
      footerNote: `<a href="${APP_URL}/api/notification-preferences/unsubscribe?token=${unsubscribeToken}" style="color: #94a3b8; text-decoration: none;">Unsubscribe from regulation updates</a>`,
    })

    return sendEmail({ to: customerEmail, subject, html })
  },
}
