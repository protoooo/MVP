// Production monitoring and error tracking
// Install Sentry: npm install @sentry/nextjs

// Uncomment below when ready to add Sentry
/*
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}
*/

// Simple error logger for now
export function logError(error, context = {}) {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to your logging service
    console.error('[ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })
    
    // TODO: Send to external logging service
    // fetch('/api/log-error', { ... })
  } else {
    console.error('[DEV ERROR]', error, context)
  }
}

export function logInfo(message, data = {}) {
  if (process.env.NODE_ENV === 'production') {
    console.log('[INFO]', {
      message,
      data,
      timestamp: new Date().toISOString()
    })
  }
}

export function logWarning(message, data = {}) {
  console.warn('[WARNING]', {
    message,
    data,
    timestamp: new Date().toISOString()
  })
}
