import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: 0.1,
  
  debug: false,
  
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  beforeSend(event) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies
      if (event.request.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
    }
    
    // Mask email addresses
    if (event.message) {
      event.message = event.message.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
        '[EMAIL]'
      )
    }
    
    return event
  }
})
