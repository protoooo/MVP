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
    const subject = 'Welcome to protocolLM - Your 7-day trial is active'

    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your 7-day trial is now active! You have full access to protocolLM for the next week—no credit card required yet.
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
      preheader: 'Your 7-day trial is active. Get started in 3 steps.',
      content,
      ctaText: 'Open protocolLM',
      ctaUrl: APP_URL,
      footerNote: '⏰ Your trial ends in 7 days. No credit card required during trial.',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 2. TRIAL DAY 3 - Engagement check-in
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
      footerNote: '⏰ 4 days left in your trial',
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 3. TRIAL DAY 5/7 - Ending soon reminder
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
        Your 7-day protocolLM trial has ended. We hope you found it useful for catching violations before the health inspector!
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
  multiLocationPurchaseComplete: async (buyerEmail, buyerName, locationCount, signupLinks) => {
    const safeName = escapeHtml(buyerName || 'there')
    const count = Number.isFinite(Number(locationCount)) ? Math.max(1, Number(locationCount)) : 1
    const links = Array.isArray(signupLinks) ? signupLinks : []

    const subject = `Your ${count}-location protocolLM licenses are ready`

    const linksHtml = links
      .map((link, idx) => {
        const number = escapeHtml(link?.number ?? idx + 1)
        const url = link?.url ? String(link.url) : ''
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: #0f172a; font-size: 15px;">Location ${number}</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
              <a href="${url}" style="display: inline-block; padding: 8px 16px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                Create Account
              </a>
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
        Your multi-location protocolLM purchase is complete! Below are <strong>${count} unique signup links</strong> — one for each location.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              📍 Your Location Signup Links
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

      <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
          ⚠️ Important: One Account Per Location
        </p>
        <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
          Each signup link is for <strong>one physical location only</strong>. Do not share credentials across locations. Each location manager must create their own account using their unique link.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>Next Steps:</strong>
      </p>
      <ol style="color: #475569; font-size: 15px; line-height: 1.8; margin: 0 0 24px 20px; padding-left: 0;">
        <li style="margin-bottom: 8px;">Forward each signup link to the appropriate location manager</li>
        <li style="margin-bottom: 8px;">Each manager clicks their link and creates an account (no payment needed)</li>
        <li style="margin-bottom: 8px;">They verify their email and start using protocolLM immediately</li>
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
      preheader: `${count} signup links ready - forward to your location managers`,
      content,
      // ✅ Keep this logic, but make it configurable and consistent with $50/mo
      footerNote: `💳 Billing: $${Number(process.env.PROTOCOLLM_LOCATION_PRICE || 149) * count}/month for ${count} locations • Each location has its own account`,
    })

    return sendEmail({ to: buyerEmail, subject, html })
  },
}
