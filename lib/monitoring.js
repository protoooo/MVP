// Simple logging without external dependencies

export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]', JSON.stringify(errorInfo))
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
}

export function setUserContext(userId, email) {
  // No-op
}

export function clearUserContext() {
  // No-op
}
