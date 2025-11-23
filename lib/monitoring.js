// lib/monitoring.js
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
}

function formatLog(level, message, data = {}) {
  return {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  }
}

export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[ERROR]', JSON.stringify(formatLog(LOG_LEVELS.ERROR, error.message, errorInfo)))
  } else {
    console.error('[DEV ERROR]', error, context)
  }
}

export function logInfo(message, data = {}) {
  const logData = formatLog(LOG_LEVELS.INFO, message, data)
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[INFO]', JSON.stringify(logData))
  } else {
    console.log('[INFO]', message, data)
  }
}

export function logWarning(message, data = {}) {
  const logData = formatLog(LOG_LEVELS.WARNING, message, data)
  console.warn('[WARNING]', JSON.stringify(logData))
}

export function setUserContext(userId, email) {
  // Reserved for future monitoring integration
}

export function clearUserContext() {
  // Reserved for future monitoring integration
}
