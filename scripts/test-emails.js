// scripts/test-emails.js - Test email system
import dotenv from 'dotenv'
import { emails } from '../lib/emails.js'

dotenv.config({ path: '.env.local' })

const RESEND_API_KEY = process.env.RESEND_API_KEY

console.log('='.repeat(70))
console.log('📧 Email System Test')
console.log('='.repeat(70))

// Check configuration
console.log('\n🔍 Checking configuration:')
console.log('RESEND_API_KEY:', RESEND_API_KEY ? `✅ ${RESEND_API_KEY.substring(0, 10)}...` : '❌ MISSING')
console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'Using default')
console.log('APP_URL:', process.env.NEXT_PUBLIC_BASE_URL || '❌ MISSING')

if (!RESEND_API_KEY) {
  console.error('\n❌ RESEND_API_KEY is required!')
  console.error('Get one at: https://resend.com/api-keys')
  process.exit(1)
}

async function testEmail(emailFn, name, description) {
  console.log(`\n📨 Testing: ${name}`)
  console.log(`   Description: ${description}`)
  
  try {
    const result = await emailFn('test@example.com', 'Test User')
    
    if (result.success) {
      console.log(`   ✅ SUCCESS - Email ID: ${result.id}`)
      return true
    } else {
      console.log(`   ❌ FAILED - ${result.error}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ ERROR - ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 Running Email Tests')
  console.log('='.repeat(70))

  const tests = [
    {
      fn: emails.trialStarted,
      name: 'Welcome Email (Trial Started)',
      desc: 'Sent when user completes checkout and trial begins'
    },
    {
      fn: emails.trialMidpoint,
      name: 'Trial Midpoint (Day 3)',
      desc: 'Engagement check-in at day 3 of trial'
    },
    {
      fn: (email, name) => emails.trialEndingSoon(email, name, 2),
      name: 'Trial Ending Soon (2 days left)',
      desc: 'Reminder that trial ends in 2 days'
    },
    {
      fn: (email, name) => emails.trialEndingSoon(email, name, 0),
      name: 'Trial Ending Today',
      desc: 'Final reminder on last day of trial'
    },
    {
      fn: (email, name) => emails.paymentFailed(email, name, 1),
      name: 'Payment Failed (Attempt 1)',
      desc: 'Notification when payment fails (first attempt)'
    },
    {
      fn: (email, name) => emails.paymentFailed(email, name, 3),
      name: 'Payment Failed (Attempt 3 - URGENT)',
      desc: 'Urgent notification after 3 failed payment attempts'
    },
    {
      fn: emails.paymentSucceeded,
      name: 'Payment Succeeded',
      desc: 'Confirmation after successful payment (post-failure)'
    },
    {
      fn: emails.subscriptionCanceled,
      name: 'Subscription Canceled',
      desc: 'Feedback request when user cancels'
    },
    {
      fn: emails.trialEnded,
      name: 'Trial Ended (No Conversion)',
      desc: 'Sent when trial expires without conversion'
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    const success = await testEmail(test.fn, test.name, test.desc)
    if (success) passed++
    else failed++
    
    // Rate limit between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 Test Results')
  console.log('='.repeat(70))
  console.log(`Total tests: ${tests.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (failed === 0) {
    console.log('\n🎉 All email tests passed! Your email system is ready.')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.')
  }
  
  console.log('\n💡 Next steps:')
  console.log('1. Check test@example.com inbox (or your actual email)')
  console.log('2. Verify emails look correct and links work')
  console.log('3. Set up cron job: npm run send-reminders')
  console.log('='.repeat(70))
}

runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n💥 Fatal error:', err)
    process.exit(1)
  })
