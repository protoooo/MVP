#!/usr/bin/env node
// scripts/send-regulation-updates.js
// Send manual regulation update emails to opted-in users
// Usage: node scripts/send-regulation-updates.js --title "Title" --description "Brief description" --details "Full details HTML" [--dry-run]

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

function getArgValue(argName) {
  const arg = args.find(a => a.startsWith(`--${argName}=`))
  return arg ? arg.split('=').slice(1).join('=') : null
}

const updateTitle = getArgValue('title')
const updateDescription = getArgValue('description')
const updateDetails = getArgValue('details')

function log(message, data = {}) {
  console.log(`[${new Date().toISOString()}] ${message}`, data)
}

function showUsage() {
  console.log(`
Usage: node scripts/send-regulation-updates.js [options]

Options:
  --title=<title>              Update title (required)
  --description=<description>  Brief description (required)
  --details=<details>          Full details in HTML format (required)
  --dry-run                    Preview recipients without sending

Example:
  node scripts/send-regulation-updates.js \\
    --title="New Handwashing Requirements" \\
    --description="Michigan now requires touchless faucets in all new food establishments" \\
    --details="<p>New regulations require all newly constructed or renovated food service establishments to install touchless handwashing faucets. Existing establishments are grandfathered but encouraged to upgrade.</p>" \\
    --dry-run

Example (real send):
  node scripts/send-regulation-updates.js \\
    --title="Food Allergen Labeling Update" \\
    --description="New requirements for sesame allergen disclosure" \\
    --details="<p>Effective immediately, sesame must be listed as a major food allergen on all labels and menus.</p><ul><li>Update all menu boards and printed menus</li><li>Train staff on sesame allergen questions</li><li>Review ingredient lists with suppliers</li></ul>"
  `)
}

async function sendRegulationUpdates() {
  // Validate required arguments
  if (!updateTitle || !updateDescription || !updateDetails) {
    console.error('Error: Missing required arguments')
    showUsage()
    process.exit(1)
  }

  log(`Starting regulation update job`, { 
    title: updateTitle,
    isDryRun 
  })

  try {
    // Get all users opted in for regulation updates
    const { data: users, error } = await supabase
      .from('user_notification_preferences')
      .select('id, email, unsubscribe_token')
      .eq('opted_in_regulation_updates', true)
      .is('unsubscribed_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      log('Error fetching users', { error: error.message })
      throw error
    }

    if (!users || users.length === 0) {
      log('No users to send updates to')
      return
    }

    log(`Found ${users.length} users to send updates`, { count: users.length })

    if (isDryRun) {
      log('[DRY RUN] Recipients:', {
        count: users.length,
        emails: users.map(u => u.email.substring(0, 3) + '***')
      })
      log('[DRY RUN] Would send this email:', {
        title: updateTitle,
        description: updateDescription,
        detailsPreview: updateDetails.substring(0, 100) + '...'
      })
      return
    }

    // Confirm before sending
    log('⚠️  About to send regulation update to ' + users.length + ' users')
    log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to proceed...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    let successCount = 0
    let failureCount = 0

    for (const user of users) {
      const customerName = user.email.includes('@') 
        ? user.email.split('@')[0] 
        : user.email.substring(0, 10) // Fallback if no @ found

      try {
        // Send email
        const result = await emails.sendRegulationUpdate(
          user.email,
          customerName,
          updateTitle,
          updateDescription,
          updateDetails,
          user.unsubscribe_token
        )

        if (result.success) {
          // Update last_regulation_update_sent
          await supabase
            .from('user_notification_preferences')
            .update({ 
              last_regulation_update_sent: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          log(`✓ Sent update to ${user.email.substring(0, 3)}***`)
          successCount++
        } else {
          log(`✗ Failed to send to ${user.email.substring(0, 3)}***`, { error: result.error })
          failureCount++
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        log(`Error sending to ${user.email.substring(0, 3)}***`, { error: error.message })
        failureCount++
      }
    }

    log(`Regulation update job complete`, {
      title: updateTitle,
      total: users.length,
      success: successCount,
      failed: failureCount,
    })
  } catch (error) {
    log(`Fatal error in update job`, { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

// Run the job
sendRegulationUpdates()
  .then(() => {
    log('Job finished successfully')
    process.exit(0)
  })
  .catch(error => {
    log('Job failed', { error: error.message })
    process.exit(1)
  })
