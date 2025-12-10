// lib/logger.js - Production-ready structured logging

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG

// Sanitize sensitive data from logs
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data
  
  const sanitized = { ...data }
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session']
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***'
    }
  })
  
  return sanitized
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const sanitizedMeta = sanitizeData(meta)
  
  const logEntry = {
    timestamp,
    level,
    message,
    env: process.env.NODE_ENV,
    ...sanitizedMeta
  }
  
  // In production, format for log aggregators
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logEntry)
  }
  
  // In development, keep it readable
  const metaStr = Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta, null, 2) : ''
  return `[${timestamp}] [${level}] ${message} ${metaStr}`
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
  },

  // Security-specific logging
  security: (message, meta) => {
    console.error(formatLog('SECURITY', `[SECURITY] ${message}`, meta))
  }
}
