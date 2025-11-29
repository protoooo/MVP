export function validateEnvironment() {
  // Skip validation in browser
  if (typeof window !== 'undefined') {
    return true
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '))
    return false
  }

  // Validate URL formats
  const urlVars = [
    'NEXT_PUBLIC_SUPABASE_URL', 
    'NEXT_PUBLIC_BASE_URL'
  ]
  
  for (const urlVar of urlVars) {
    try {
      new URL(process.env[urlVar])
    } catch {
      console.error(`❌ Invalid URL format for ${urlVar}:`, process.env[urlVar])
      return false
    }
  }

  // Validate Stripe keys format
  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ STRIPE_SECRET_KEY appears invalid (should start with sk_)')
    return false
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    console.error('❌ STRIPE_WEBHOOK_SECRET appears invalid (should start with whsec_)')
    return false
  }

  console.log('✅ Environment variables validated successfully')
  return true
}

export function getRequiredEnvVar(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export function validateEnvOnStartup() {
  if (process.env.NODE_ENV === 'production') {
    if (!validateEnvironment()) {
      console.error('❌ Environment validation failed. Server may not function correctly.')
      // In production, we log but don't exit to allow health checks to report the issue
    }
  } else {
    // In development, just validate and warn
    validateEnvironment()
  }
}
