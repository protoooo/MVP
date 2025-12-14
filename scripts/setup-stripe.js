// scripts/setup-stripe.js - Verify Stripe configuration
import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

console.log('='.repeat(70))
console.log('💳 Stripe Configuration Check')
console.log('='.repeat(70))

async function checkStripe() {
  console.log('\n🔍 Checking Stripe configuration...')
  
  // 1. Check API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is missing!')
    return false
  }
  
  try {
    const balance = await stripe.balance.retrieve()
    console.log('✅ Stripe API key is valid')
    console.log(`   Account balance: ${balance.available[0].amount / 100} ${balance.available[0].currency.toUpperCase()}`)
  } catch (error) {
    console.error('❌ Invalid Stripe API key:', error.message)
    return false
  }
  
  // 2. Check webhook secret
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET is missing (required for production)')
  } else {
    console.log('✅ Webhook secret is configured')
  }
  
  // 3. Check price IDs
  const prices = {
    'Business Monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY,
    'Business Annual': process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL,
    'Enterprise Monthly': process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY,
    'Enterprise Annual': process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL,
  }
  
  console.log('\n📋 Checking prices:')
  for (const [name, priceId] of Object.entries(prices)) {
    if (!priceId) {
      console.log(`   ⚠️  ${name}: Not configured`)
      continue
    }
    
    try {
      const price = await stripe.prices.retrieve(priceId)
      console.log(`   ✅ ${name}: $${price.unit_amount / 100}/${price.recurring.interval}`)
    } catch (error) {
      console.log(`   ❌ ${name}: Invalid price ID (${priceId})`)
    }
  }
  
  // 4. Check billing portal configuration
  console.log('\n🏠 Checking Billing Portal:')
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 1 })
    
    if (configs.data.length === 0) {
      console.log('   ⚠️  No billing portal configuration found')
      console.log('\n   📝 To configure:')
      console.log('   1. Go to: https://dashboard.stripe.com/settings/billing/portal')
      console.log('   2. Click "Activate customer portal"')
      console.log('   3. Enable:')
      console.log('      ✓ Invoice history')
      console.log('      ✓ Update payment method')
      console.log('      ✓ Cancel subscription')
      console.log('      ✗ DISABLE: Pause subscription (prevents abuse)')
      console.log('   4. Save configuration')
    } else {
      const config = configs.data[0]
      console.log(`   ✅ Portal is configured (ID: ${config.id})`)
      console.log('   Features enabled:')
      
      if (config.features.invoice_history.enabled) {
        console.log('      ✓ Invoice history')
      }
      if (config.features.payment_method_update.enabled) {
        console.log('      ✓ Payment method updates')
      }
      if (config.features.subscription_cancel.enabled) {
        console.log('      ✓ Subscription cancellation')
      }
      if (config.features.subscription_pause?.enabled) {
        console.log('      ⚠️  Subscription pausing (SHOULD BE DISABLED)')
      }
    }
  } catch (error) {
    console.log('   ❌ Failed to check portal:', error.message)
  }
  
  // 5. Check webhooks
  console.log('\n🔗 Checking Webhooks:')
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
    
    if (webhooks.data.length === 0) {
      console.log('   ⚠️  No webhooks configured')
      console.log('\n   📝 To configure:')
      console.log('   1. Go to: https://dashboard.stripe.com/webhooks')
      console.log('   2. Click "Add endpoint"')
      console.log(`   3. URL: ${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`)
      console.log('   4. Select events:')
      console.log('      ✓ checkout.session.completed')
      console.log('      ✓ customer.subscription.updated')
      console.log('      ✓ customer.subscription.deleted')
      console.log('      ✓ invoice.payment_failed')
      console.log('      ✓ invoice.payment_succeeded')
      console.log('   5. Copy "Signing secret" to STRIPE_WEBHOOK_SECRET')
    } else {
      console.log(`   ✅ ${webhooks.data.length} webhook(s) configured:`)
      for (const webhook of webhooks.data) {
        const isProduction = webhook.url.includes(process.env.NEXT_PUBLIC_BASE_URL)
        console.log(`      ${isProduction ? '✓' : '⚠️'} ${webhook.url}`)
        console.log(`         Status: ${webhook.status}`)
        console.log(`         Events: ${webhook.enabled_events.length}`)
      }
    }
  } catch (error) {
    console.log('   ❌ Failed to check webhooks:', error.message)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ Stripe check complete')
  console.log('='.repeat(70))
  
  return true
}

checkStripe()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n💥 Fatal error:', err)
    process.exit(1)
  })
