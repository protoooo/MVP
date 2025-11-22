import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: 0.1,
  
  debug: false,
  
  beforeSend(event) {
    // Remove all request headers and cookies
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }
    
    // Remove sensitive environment variables from context
    if (event.contexts?.runtime?.environment) {
      const env = event.contexts.runtime.environment
      delete env.SUPABASE_SERVICE_ROLE_KEY
      delete env.STRIPE_SECRET_KEY
      delete env.GOOGLE_CREDENTIALS_JSON
      delete env.GEMINI_API_KEY
    }
    
    return event
  }
})
