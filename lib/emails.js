// lib/emails.js - Complete transactional email system with Resend

import { logger } from './logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'protocolLM <hello@protocollm.org>'
const SUPPORT_EMAIL = 'hello@protocollm.org'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org'

// Base email sender
async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    logger.error('RESEND_API_KEY not configured - email not sent', { to, subject })
    return { success: false, error: 'Email not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        reply_to: replyTo || SUPPORT_EMAIL
      })
    })

    const data = await res.json()

    if (!res.ok) {
      logger.error('Email send failed', { error: data, to, subject })
      return { success: false, error: data }
    }

    logger.info('Email sent', { to, subject, id: data.id })
    return { success: true, id: data.id }

  } catch (error) {
    logger.error('Email exception', { error: error.message, to, subject })
    return { success: false, error: error.message }
  }
}

// Email template wrapper (consistent styling)
function emailTemplate({ title, preheader, content, ctaText, ctaUrl, footerNote }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 20px 16px !important; }
      .mobile-text { font-size: 14px !important; line-height: 1.5 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  
  <!-- Preheader text (hidden but shows in email preview) -->
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                protocol<span style="font-weight: 900;">LM</span>
              </h1>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px; letter-spacing: 0.02em;">
                Food Safety Compliance • Washtenaw County
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- CTA Button (if provided) -->
          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding: 0 32px 40px 32px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; background-color: #0f172a; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.01em;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer Note (if provided) -->
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

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 12px 0;">
                Questions? Reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #3b82f6; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                protocolLM • Made in Washtenaw County for Washtenaw County
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
    const subject = "Welcome to protocolLM - Your 7-day trial is active"
    
    const content = `
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
      preheader: 'We\'d love to hear your feedback',
      content,
      footerNote: 'You can resubscribe anytime at protocollm.org'
    })

    return sendEmail({ to: userEmail, subject, html })
  }
}

// ============================================================================
// WEBHOOK INTEGRATION HELPERS
// ============================================================================

// Call this from your webhook when checkout completes
export async function handleSubscriptionCreated(subscription, userEmail) {
  const userName = userEmail.split('@')[0]
  await emails.trialStarted(userEmail, userName)
}

// Call this from your webhook when payment fails
export async function handlePaymentFailed(invoice, userEmail, attemptCount) {
  const userName = userEmail.split('@')[0]
  await emails.paymentFailed(userEmail, userName, attemptCount)
}

// Call this from your webhook when payment succeeds after failure
export async function handlePaymentRecovered(userEmail) {
  const userName = userEmail.split('@')[0]
  await emails.paymentSucceeded(userEmail, userName)
}

// Call this from your webhook when subscription is canceled
export async function handleSubscriptionCanceled(userEmail) {
  const userName = userEmail.split('@')[0]
  await emails.subscriptionCanceled(userEmail, userName)
}

// ============================================================================
// SCHEDULED TASKS (set up with Railway cron or external service)
// ============================================================================

// Run this daily to send trial reminder emails
export async function sendScheduledTrialReminders() {
  // This requires setting up a cron job or Railway scheduled task
  // For now, just export the functions and you can trigger them manually
  // or set up later with something like Railway Cron or Vercel Cron
  
  logger.info('Scheduled trial reminders - set up cron job to use this')
  
  // Example implementation (you'll need to build this):
  // 1. Query Supabase for trials ending in 2 days
  // 2. Loop through and send emails
  // 3. Mark emails as sent to avoid duplicates
} 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your 7-day trial is now active! You have full access to protocolLM for the next week—no credit card required yet.
      </p>

      <!-- Quick Start Guide -->
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
                  Type any food safety question like "Can lettuce go above raw chicken?" Get answers backed by Washtenaw County regulations.
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
      footerNote: '⏰ Your trial ends in 7 days. No credit card required during trial.'
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 2. TRIAL DAY 3 - Engagement check-in
  // --------------------------------------------------------------------------
  trialMidpoint: async (userEmail, userName) => {
    const subject = "How's your trial going?"
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        You're halfway through your protocolLM trial. How's it going?
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        I wanted to check in and see if you have any questions. Here are a few tips from other Washtenaw County restaurants:
      </p>

      <!-- Tips -->
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
      preheader: 'Tips from other Washtenaw County restaurants',
      content,
      ctaText: 'Open protocolLM',
      ctaUrl: APP_URL,
      footerNote: '⏰ 4 days left in your trial'
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 3. TRIAL DAY 5 - Ending soon reminder
  // --------------------------------------------------------------------------
  trialEndingSoon: async (userEmail, userName, daysLeft) => {
    const subject = `Your trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Just a heads up—your protocolLM trial ends in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.
      </p>

      <!-- Value Reminder -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 8px; margin: 24px 0;">
        <tr>
          <td style="padding: 24px; text-align: center;">
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">
              Keep catching violations before the inspector
            </p>
            <p style="color: rgba(255,255,255,0.8); font-size: 32px; font-weight: 700; margin: 0 0 8px 0;">
              $100/month
            </p>
            <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">
              Cancel anytime • No long-term contract
            </p>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        To keep using protocolLM after your trial, subscribe for $100/month. That's <strong>less than one avoided violation fine</strong> ($200-500).
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
      preheader: `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left in your trial`,
      content,
      ctaText: 'Subscribe Now',
      ctaUrl: APP_URL,
      footerNote: `⏰ Trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Subscribe to keep access.`
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 4. TRIAL ENDED - Last chance to subscribe
  // --------------------------------------------------------------------------
  trialEnded: async (userEmail, userName) => {
    const subject = "Your trial has ended - Subscribe to regain access"
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your 7-day protocolLM trial has ended. To regain access, subscribe for <strong>$100/month</strong>.
      </p>

      <!-- Reminder of value -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              ⚠️ What you're missing:
            </p>
            <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Instant photo checks for violations</li>
              <li>Washtenaw County regulation search</li>
              <li>Staff training shortcuts</li>
              <li>Confidence before inspections</li>
            </ul>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
        Ready to continue? Click below to subscribe.
      </p>
    `

    const html = emailTemplate({
      title: 'Your trial has ended',
      preheader: 'Subscribe to regain access to protocolLM',
      content,
      ctaText: 'Subscribe for $100/month',
      ctaUrl: APP_URL,
      footerNote: 'Questions? Reply to this email or contact hello@protocollm.org'
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 5. PAYMENT FAILED - Urgent action required
  // --------------------------------------------------------------------------
  paymentFailed: async (userEmail, userName, attemptCount = 1) => {
    const isUrgent = attemptCount >= 3
    const subject = isUrgent 
      ? "⚠️ Payment failed - Update your card now"
      : "Payment failed - We'll retry soon"
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        ${isUrgent 
          ? 'We couldn\'t process your payment for protocolLM after 3 attempts. <strong>Your access has been suspended.</strong>'
          : 'We couldn\'t process your payment for protocolLM. We\'ll automatically retry in a few days.'
        }
      </p>

      ${isUrgent ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0;">
              ⚠️ Update your payment method to restore access
            </p>
          </td>
        </tr>
      </table>
      ` : ''}

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
        ${isUrgent 
          ? 'Update your card now to restore access.'
          : 'No action needed—we\'ll try again automatically. But if you want to update your card now, click below.'
        }
      </p>
    `

    const html = emailTemplate({
      title: 'Payment Failed',
      preheader: isUrgent ? 'Update your card to restore access' : 'We\'ll retry your payment automatically',
      content,
      ctaText: 'Update Payment Method',
      ctaUrl: APP_URL,
      footerNote: isUrgent 
        ? '⚠️ Access suspended. Update your card to continue using protocolLM.'
        : 'We\'ll automatically retry your payment. No action needed.'
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 6. PAYMENT SUCCEEDED (after failure recovery)
  // --------------------------------------------------------------------------
  paymentSucceeded: async (userEmail, userName) => {
    const subject = "✅ Payment successful - Access restored"
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
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
      footerNote: '✅ Payment successful. Thank you for being a protocolLM customer!'
    })

    return sendEmail({ to: userEmail, subject, html })
  },

  // --------------------------------------------------------------------------
  // 7. SUBSCRIPTION CANCELED - Feedback request
  // --------------------------------------------------------------------------
  subscriptionCanceled: async (userEmail, userName) => {
    const subject = "Sorry to see you go"
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${userName || 'there'},
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Your protocolLM subscription has been canceled. You'll have access until the end of your current billing period.
      </p>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Before you go, would you mind sharing why you canceled? Your feedback helps us improve for other Washtenaw County restaurants.
      </p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <p style="color: #0f172a; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
              Common reasons for canceling:
            </p>
            <ul style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Not using it enough</li>
              <li>Too expensive</li>
              <li>Found another solution</li>
              <li>Restaurant closed/sold</li>
              <li>Something else</li>
            </ul>
          </td>
        </tr>
      </table>

      <p style="color: #334155; font-size: 16px; line-height:
