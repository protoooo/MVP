#!/usr/bin/env node
// scripts/send-inspection-reminders.js
// Send semi-annual inspection reminders to opted-in users
// Run this script in early March and early September
// Usage: node scripts/send-inspection-reminders.js [--season spring|fall] [--dry-run]

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { emails } from '../lib/emails.js'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const seasonArg = args.find(arg => arg.startsWith('--season='))
const season = seasonArg ? seasonArg.split('=')[1] : detectSeason()

function detectSeason() {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 2 && month <= 5) return 'spring'
  if (month >= 8 && month <= 10) return 'fall'
  return 'spring' // default
}

function log(message, data = {}) {
  console.log(`[${new Date().toISOString()}] ${message}`, data)
}

async function sendInspectionReminders() {
  log(`Starting inspection reminder job`, { season, isDryRun })

  try {
    // Get all users opted in for inspection reminders who haven't been sent recently
    // We'll send reminders max once every 5 months (150 days) to avoid spamming
    const fiveMonthsAgo = new Date()
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5)

    const { data: users, error } = await supabase
      .from('user_notification_preferences')
      .select('id, email, last_reminder_sent')
      .eq('opted_in_inspection_reminders', true)
      .is('unsubscribed_at', null)
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${fiveMonthsAgo.toISOString()}`)
      .order('created_at', { ascending: true })

    if (error) {
      log('Error fetching users', { error: error.message })
      throw error
    }

    if (!users || users.length === 0) {
      log('No users to send reminders to')
      return
    }

    log(`Found ${users.length} users to send reminders`, { count: users.length })

    let successCount = 0
    let failureCount = 0

    for (const user of users) {
      const customerName = user.email.includes('@') 
        ? user.email.split('@')[0] 
        : user.email.substring(0, 10) // Fallback if no @ found

      try {
        if (isDryRun) {
          log(`[DRY RUN] Would send reminder to ${user.email.substring(0, 3)}***`)
        } else {
          // Get unsubscribe token
          const { data: prefs } = await supabase
            .from('user_notification_preferences')
            .select('unsubscribe_token')
            .eq('id', user.id)
            .single()

          if (!prefs?.unsubscribe_token) {
            log(`Missing unsubscribe token for user`, { email: user.email.substring(0, 3) + '***' })
            failureCount++
            continue
          }

          // Send email
          const result = await emails.sendInspectionReminder(
            user.email,
            customerName,
            prefs.unsubscribe_token,
            season
          )

          if (result.success) {
            // Update last_reminder_sent
            await supabase
              .from('user_notification_preferences')
              .update({ 
                last_reminder_sent: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)

            log(`✓ Sent reminder to ${user.email.substring(0, 3)}***`)
            successCount++
          } else {
            log(`✗ Failed to send to ${user.email.substring(0, 3)}***`, { error: result.error })
            failureCount++
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        log(`Error sending to ${user.email.substring(0, 3)}***`, { error: error.message })
        failureCount++
      }
    }

    log(`Inspection reminder job complete`, {
      season,
      isDryRun,
      total: users.length,
      success: successCount,
      failed: failureCount,
    })
  } catch (error) {
    log(`Fatal error in reminder job`, { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

// Run the job
sendInspectionReminders()
  .then(() => {
    log('Job finished successfully')
    process.exit(0)
  })
  .catch(error => {
    log('Job failed', { error: error.message })
    process.exit(1)
  })
