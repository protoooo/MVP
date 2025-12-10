// lib/logger.js
// Structured logging to replace console.log in production

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  }
  
  // In production, you'd send this to a logging service (Sentry, LogDNA, etc.)
  if (process.env.NODE_ENV === 'production') {
    // For now, still use console but formatted
    return JSON.stringify(logEntry)
  }
  
  // In development, keep it readable
  return `[${timestamp}] [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
}

export const logger = {
  debug: (message, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog('DEBUG', message, meta))
    }
  },
  
  info: (message, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.info(formatLog('INFO', message, meta))
    }
  },
  
  warn: (message, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, meta))
    }
  },
  
  error: (message, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, meta))
    }
  }
}
