// lib/emails.js - Transactional email system with Resend

import { logger } from './logger'

// Get Resend API key from env
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'protocolLM <hello@protocollm.org>'

// Simple fetch-based email sender (no SDK required)
async function sendEmail({ to, subject, html }) {
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
        html
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

// Email Templates
export const emails = {
  // Day 1: Welcome & Getting Started
  trialStarted: async (userEmail, userName) => {
    const subject = "Welcome to protocolLM - Let's get started"
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Welcome to protocolLM</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px;">Your compliance assistant for Washtenaw County</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px 24px;">
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hi ${userName || 'there'},
              </p>

              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Your 7-day trial is now active! Here's how to get the most out of protocolLM:
              </p>

              <!-- Tips -->
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Quick Start Guide</h3>
                
                <div style="margin-bottom: 16px;">
                  <strong style="color: #0f172a; font-size: 15px;">📸 Take a Photo</strong>
                  <p style="color: #475569; font-size: 14px; margin: 4px 0 0 0; line-height: 1.5;">
                    Snap a picture of your walk-in, prep area, or dish station. Get instant violation checks.
                  </p>
                </div>

                <div style="margin-bottom: 16px;">
                  <strong style="color: #0f172a; font-size: 15px;">💬 Ask Questions</strong>
                  <p style="color: #475569; font-size: 14px; margin: 4px 0 0 0; line-height: 1.5;">
                    Type any food safety question. We'll search Washtenaw County regulations instantly.
                  </p>
                </div>

                <div>
                  <strong style="color: #0f172a; font-size: 15px;">📋 Daily Checks</strong>
                  <p style="color: #475569; font-size: 14px; margin: 4px 0 0 0; line-height: 1.5;">
                    Use it before inspection windows (9am-2pm) or when training new staff.
                  </p>
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://protocollm.org" style="display: inline-block; background-color: #0f172a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Open protocolLM
                </a>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                Questions? Reply to this email or contact us at hello@protocollm.org
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                protocolLM • Made in Washtenaw County for Washtenaw County
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    return sendEmail({ to: userEmail, subject, html })
  },

  // Day 5: Trial Ending Soon
  trialEndingSoon: async (userEmail, userName, daysLeft) => {
    const subject = `Your trial ends in ${daysLeft} days`
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px;">
            <h2 style="color: #0f172a; margin: 0 0 16px 0;">Your trial ends in ${daysLeft} days</h2>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Hi ${userName || 'there'},
            </p>

            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Just a heads up - your protocolLM trial ends in <strong>${daysLeft} days</strong>.
            </p>

            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              To keep using photo checks and regulation search, subscribe for <strong>$100/month</strong>.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://protocollm.org" style="display: inline-block; background-color: #0f172a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Subscribe Now
              </a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
              Questions? Reply to this email anytime.
            </p>
          </div>
        </body>
      </html>
    `

    return sendEmail({ to: userEmail, subject, html })
  },

  // Payment Failed
  paymentFailed: async (userEmail, userName) => {
    const subject = "Payment failed - Update your card"
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px;">
            <h2 style="color: #dc2626; margin: 0 0 16px 0;">Payment Failed</h2>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Hi ${userName || 'there'},
            </p>

            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              We couldn't process your payment for protocolLM. Please update your payment method to avoid service interruption.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://protocollm.org" style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Update Payment Method
              </a>
            </div>
          </div>
        </body>
      </html>
    `

    return sendEmail({ to: userEmail, subject, html })
  }
}

// Hook into Stripe webhooks to send emails automatically
export async function handleSubscriptionCreated(subscription, userEmail) {
  await emails.trialStarted(userEmail, userEmail.split('@')[0])
}

// Schedule these with a cron job or Railway scheduled task
export async function sendTrialReminders() {
  // Query Supabase for trials ending in 2 days
  // Send reminder emails
  // (Implementation depends on your cron setup)
}
