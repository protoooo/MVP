// test-supabase.mjs - Run this to diagnose your Supabase issue
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Supabase Diagnostics\n')
console.log('=' .repeat(60))

// Check environment variables
console.log('1. Environment Variables:')
console.log(`   URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`   Key: ${SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`)

if (SUPABASE_URL) {
  console.log(`   URL Value: ${SUPABASE_URL}`)
}
if (SUPABASE_KEY) {
  console.log(`   Key Prefix: ${SUPABASE_KEY.substring(0, 20)}...`)
  console.log(`   Key Length: ${SUPABASE_KEY.length} characters`)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('\n❌ Missing credentials. Check your .env.local file.')
  process.exit(1)
}

console.log('\n2. Testing Connection...')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Test 1: Simple query
console.log('\n   Test 1: Basic Query')
try {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .limit(1)
  
  if (error) {
    console.log('   ❌ Failed:', error.message)
    console.log('   Error Code:', error.code)
    console.log('   Error Details:', error.details)
  } else {
    console.log('   ✅ Query successful')
  }
} catch (err) {
  console.log('   ❌ Exception:', err.message)
}

// Test 2: Insert attempt
console.log('\n   Test 2: Insert Test')
try {
  const testData = {
    content: 'test content',
    metadata: { test: true },
    embedding: new Array(1536).fill(0) // Dummy embedding
  }
  
  const { data, error } = await supabase
    .from('documents')
    .insert(testData)
    .select()
  
  if (error) {
    console.log('   ❌ Insert failed:', error.message)
    console.log('   Error Code:', error.code)
    
    // Check if it's an auth error
    if (error.message.includes('invalid_grant') || error.message.includes('grant')) {
      console.log('\n   ⚠️  This is an AUTHENTICATION error!')
      console.log('   Your SUPABASE_SERVICE_ROLE_KEY is likely wrong.')
    }
  } else {
    console.log('   ✅ Insert successful')
    console.log('   Inserted ID:', data[0]?.id)
    
    // Clean up test data
    if (data[0]?.id) {
      await supabase.from('documents').delete().eq('id', data[0].id)
      console.log('   🧹 Cleaned up test data')
    }
  }
} catch (err) {
  console.log('   ❌ Exception:', err.message)
}

// Test 3: Auth status
console.log('\n   Test 3: Check Auth Status')
try {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.log('   ℹ️  No user session (expected for service role)')
  } else if (user) {
    console.log('   ℹ️  User found:', user.email)
  } else {
    console.log('   ℹ️  Service role key - no user context')
  }
} catch (err) {
  console.log('   ℹ️  Auth check skipped:', err.message)
}

console.log('\n' + '='.repeat(60))
console.log('\n📋 Next Steps:')
console.log('   1. If you see authentication errors above:')
console.log('      → Go to Supabase Dashboard > Settings > API')
console.log('      → Copy the "service_role" key (NOT the anon key)')
console.log('      → Update SUPABASE_SERVICE_ROLE_KEY in .env.local')
console.log('\n   2. If table/column errors:')
console.log('      → Check your database schema matches the code')
console.log('\n   3. If RLS (Row Level Security) errors:')
console.log('      → Service role should bypass RLS, but check policies')
console.log('\n')
