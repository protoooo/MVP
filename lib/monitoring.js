import * as Sentry from "@sentry/nextjs"

// Initialize Sentry only if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
      }
      
      // Remove any potential PII from error messages
      if (event.message) {
        event.message = event.message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      }
      
      return event
    },
    
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch'
    ]
  })
}

export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  }

  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: context
      })
    }
    
    // Also log to console for Railway/server logs
    console.error('[ERROR]', errorInfo)
  } else {
    console.error('[DEV ERROR]', error, context)
  }
}

export function logInfo(message, data = {}) {
  const logData = {
    message,
    data,
    timestamp: new Date().toISOString()
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[INFO]', JSON.stringify(logData))
  } else {
    console.log('[INFO]', message, data)
  }
}

export function logWarning(message, data = {}) {
  const logData = {
    message,
    data,
    timestamp: new Date().toISOString()
  }
  
  console.warn('[WARNING]', JSON.stringify(logData))
  
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') {
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: data
    })
  }
}

export function setUserContext(userId, email) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email: email
    })
  }
}

export function clearUserContext() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null)
  }
}
