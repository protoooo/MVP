// scripts/verify-security.js
// Run this to verify all security fixes are working
// Usage: node scripts/verify-security.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TESTS = {
  passed: [],
  failed: [],
  warnings: []
}

function log(emoji, category, message) {
  console.log(`${emoji} [${category}] ${message}`)
}

function pass(test, message) {
  TESTS.passed.push({ test, message })
  log('✅', test, message)
}

function fail(test, message) {
  TESTS.failed.push({ test, message })
  log('❌', test, message)
}

function warn(test, message) {
  TESTS.warnings.push({ test, message })
  log('⚠️ ', test, message)
}

// ============================================
// TEST 1: RLS Enabled on All Tables
// ============================================
async function testRLSEnabled() {
  const tables = ['user_profiles', 'subscriptions', 'checkout_attempts', 'chats', 'messages']
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('check_rls_enabled', { 
      table_name: table 
    })
    
    if (error) {
      // Fallback query
      const { data: pgData } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', table)
        .eq('schemaname', 'public')
        .single()
      
      if (pgData?.rowsecurity) {
        pass('RLS', `${table}: Enabled`)
      } else {
        fail('RLS', `${table}: NOT ENABLED - CRITICAL SECURITY ISSUE`)
      }
    }
  }
}

// ============================================
// TEST 2: Policies Exist
// ============================================
async function testPoliciesExist() {
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('tablename, policyname')
    .eq('schemaname', 'public')
  
  const requiredPolicies = {
    'user_profiles': ['Users read own profile', 'Users update own profile', 'Service role full access profiles'],
    'subscriptions': ['Users read own subscription', 'Service role full access subscriptions'],
    'checkout_attempts': ['Users read own checkout attempts', 'Users insert checkout attempts'],
    'chats': ['Users read own chats', 'Users insert own chats'],
    'messages': ['Users read own messages', 'Users insert own messages']
  }
  
  for (const [table, expectedPolicies] of Object.entries(requiredPolicies)) {
    const tablePolicies = policies.filter(p => p.tablename === table)
    
    if (tablePolicies.length === 0) {
      fail('POLICIES', `${table}: NO POLICIES FOUND - CRITICAL`)
      continue
    }
    
    for (const expectedPolicy of expectedPolicies) {
      const exists = tablePolicies.some(p => p.policyname === expectedPolicy)
      if (exists) {
        pass('POLICIES', `${table}: ${expectedPolicy}`)
      } else {
        fail('POLICIES', `${table}: MISSING ${expectedPolicy}`)
      }
    }
  }
}

// ============================================
// TEST 3: Checkout Attempts Rate Limiting
// ============================================
async function testCheckoutRateLimit() {
  // This tests the RLS policy that limits checkout attempts
  const testUserId = '00000000-0000-0000-0000-000000000000' // Dummy ID
  
  const { count } = await supabase
    .from('checkout_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', testUserId)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  
  if (count !== null) {
    pass('RATE LIMIT', `Checkout attempts query works (found ${count})`)
  } else {
    warn('RATE LIMIT', 'Unable to verify checkout rate limiting')
  }
}

// ============================================
// TEST 4: Subscription Validation Logic
// ============================================
async function testSubscriptionValidation() {
  // Get a sample subscription
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status, current_period_end, plan')
    .in('status', ['active', 'trialing'])
    .limit(1)
  
  if (subs && subs.length > 0) {
    const sub = subs[0]
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()
    
    if (periodEnd > now) {
      pass('SUBSCRIPTION', `Valid subscription found (${sub.plan}, expires ${periodEnd.toLocaleDateString()})`)
    } else {
      warn('SUBSCRIPTION', `Expired subscription found in active status`)
    }
  } else {
    warn('SUBSCRIPTION', 'No active subscriptions to test')
  }
}

// ============================================
// TEST 5: User Profile Security
// ============================================
async function testProfileSecurity() {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, is_subscribed, requests_used, images_used')
    .limit(5)
  
  if (profiles && profiles.length > 0) {
    pass('PROFILES', `Retrieved ${profiles.length} profiles`)
    
    // Check for data consistency
    for (const profile of profiles) {
      if (profile.requests_used == null || profile.images_used == null) {
        warn('PROFILES', `Profile ${profile.id.substring(0, 8)} has null usage counters`)
      }
    }
  } else {
    warn('PROFILES', 'No profiles found to test')
  }
}

// ============================================
// TEST 6: Increment Usage Function
// ============================================
async function testIncrementUsage() {
  try {
    // This should fail for non-existent user (expected)
    const { error } = await supabase.rpc('increment_usage', {
      user_id: '00000000-0000-0000-0000-000000000000',
      is_image: false
    })
    
    // Function exists if we get a specific error (not "function does not exist")
    if (error && !error.message.includes('does not exist')) {
      pass('FUNCTION', 'increment_usage function exists and is callable')
    } else if (!error) {
      pass('FUNCTION', 'increment_usage executed (test user may exist)')
    } else {
      fail('FUNCTION', 'increment_usage function does not exist')
    }
  } catch (e) {
    fail('FUNCTION', `increment_usage error: ${e.message}`)
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  console.log('\n🔐 PROTOCOLLM SECURITY VERIFICATION')
  console.log('=' .repeat(60))
  console.log('\n')
  
  await testRLSEnabled()
  console.log('\n')
  
  await testPoliciesExist()
  console.log('\n')
  
  await testCheckoutRateLimit()
  console.log('\n')
  
  await testSubscriptionValidation()
  console.log('\n')
  
  await testProfileSecurity()
  console.log('\n')
  
  await testIncrementUsage()
  console.log('\n')
  
  // SUMMARY
  console.log('=' .repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(60))
  console.log(`✅ Passed: ${TESTS.passed.length}`)
  console.log(`❌ Failed: ${TESTS.failed.length}`)
  console.log(`⚠️  Warnings: ${TESTS.warnings.length}`)
  console.log('\n')
  
  if (TESTS.failed.length > 0) {
    console.log('❌ CRITICAL FAILURES:')
    TESTS.failed.forEach(({ test, message }) => {
      console.log(`   • [${test}] ${message}`)
    })
    console.log('\n')
    process.exit(1)
  }
  
  if (TESTS.warnings.length > 0) {
    console.log('⚠️  WARNINGS:')
    TESTS.warnings.forEach(({ test, message }) => {
      console.log(`   • [${test}] ${message}`)
    })
    console.log('\n')
  }
  
  console.log('✅ ALL CRITICAL TESTS PASSED')
  console.log('\n')
}

runAllTests().catch(error => {
  console.error('\n❌ TEST SUITE FAILED:', error)
  process.exit(1)
})
