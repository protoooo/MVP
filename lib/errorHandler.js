// lib/errorHandler.js
// Centralized error handling with user-friendly messages

import { monitoring } from './monitoring'

// Error types with user-friendly messages
export const ErrorTypes = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_001',
    message: 'Invalid email or password.',
    status: 401
  },
  AUTH_SESSION_EXPIRED: {
    code: 'AUTH_002',
    message: 'Your session has expired. Please sign in again.',
    status: 401
  },
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_003',
    message: 'You must be signed in to access this feature.',
    status: 401
  },
  
  // Subscription errors
  SUB_INACTIVE: {
    code: 'SUB_001',
    message: 'Active subscription required. Please upgrade your plan.',
    status: 403
  },
  SUB_LIMIT_REACHED: {
    code: 'SUB_002',
    message: 'Monthly limit reached. Please upgrade your plan or wait for next billing cycle.',
    status: 429
  },
  SUB_PAYMENT_FAILED: {
    code: 'SUB_003',
    message: 'Payment failed. Please update your payment method.',
    status: 402
  },
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_001',
    message: 'Too many requests. Please slow down and try again in a moment.',
    status: 429
  },
  
  // Validation errors
  VALIDATION_INVALID_INPUT: {
    code: 'VAL_001',
    message: 'Invalid input provided. Please check your data and try again.',
    status: 400
  },
  VALIDATION_MISSING_FIELD: {
    code: 'VAL_002',
    message: 'Required field missing. Please complete all required fields.',
    status: 400
  },
  VALIDATION_FILE_TOO_LARGE: {
    code: 'VAL_003',
    message: 'File too large. Maximum size is 5MB.',
    status: 400
  },
  VALIDATION_INVALID_FILE_TYPE: {
    code: 'VAL_004',
    message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    status: 400
  },
  
  // AI errors
  AI_SERVICE_UNAVAILABLE: {
    code: 'AI_001',
    message: 'AI service temporarily unavailable. Please try again in a moment.',
    status: 503
  },
  AI_RESPONSE_ERROR: {
    code: 'AI_002',
    message: 'Error generating response. Please try rephrasing your question.',
    status: 500
  },
  AI_CONTEXT_TOO_LARGE: {
    code: 'AI_003',
    message: 'Query too complex. Please try breaking it into smaller questions.',
    status: 400
  },
  
  // Database errors
  DB_CONNECTION_ERROR: {
    code: 'DB_001',
    message: 'Database connection error. Our team has been notified.',
    status: 503
  },
  DB_QUERY_ERROR: {
    code: 'DB_002',
    message: 'Database query error. Please try again.',
    status: 500
  },
  
  // Generic errors
  INTERNAL_SERVER_ERROR: {
    code: 'SYS_001',
    message: 'An unexpected error occurred. Our team has been notified.',
    status: 500
  },
  SERVICE_UNAVAILABLE: {
    code: 'SYS_002',
    message: 'Service temporarily unavailable. Please try again later.',
    status: 503
  }
}

export class AppError extends Error {
  constructor(errorType, details = {}) {
    super(errorType.message)
    this.name = 'AppError'
    this.code = errorType.code
    this.status = errorType.status
    this.details = details
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    }
  }
}

export class ErrorHandler {
  // Handle error and return appropriate response
  static async handle(error, context = {}) {
    // Track error in monitoring
    await monitoring.trackError(error, context)
    
    // If it's already an AppError, use it directly
    if (error instanceof AppError) {
      return {
        status: error.status,
        body: error.toJSON()
      }
    }
    
    // Map common errors to AppError
    const mappedError = this.mapError(error, context)
    
    return {
      status: mappedError.status,
      body: mappedError.toJSON()
    }
  }

  // Map common errors to AppError types
  static mapError(error, context) {
    // Supabase auth errors
    if (error.message?.includes('Invalid login credentials')) {
      return new AppError(ErrorTypes.AUTH_INVALID_CREDENTIALS, { context })
    }
    
    if (error.message?.includes('JWT expired')) {
      return new AppError(ErrorTypes.AUTH_SESSION_EXPIRED, { context })
    }
    
    // Rate limit errors
    if (error.message?.includes('Rate limit')) {
      return new AppError(ErrorTypes.RATE_LIMIT_EXCEEDED, { context })
    }
    
    // Validation errors
    if (error.message?.includes('too large')) {
      return new AppError(ErrorTypes.VALIDATION_FILE_TOO_LARGE, { context })
    }
    
    // Database errors
    if (error.message?.includes('PGRST') || error.message?.includes('database')) {
      return new AppError(ErrorTypes.DB_QUERY_ERROR, { 
        context,
        original: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
    
    // Gemini/Vertex AI errors
    if (error.message?.includes('Vertex') || error.message?.includes('Gemini')) {
      return new AppError(ErrorTypes.AI_SERVICE_UNAVAILABLE, { context })
    }
    
    // Default to internal server error
    return new AppError(ErrorTypes.INTERNAL_SERVER_ERROR, {
      context,
      original: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  // Async error wrapper for route handlers
  static wrap(handler) {
    return async (req, context) => {
      try {
        return await handler(req, context)
      } catch (error) {
        console.error('[ErrorHandler] Caught error:', error)
        const { status, body } = await this.handle(error, {
          path: req.url,
          method: req.method
        })
        
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

// Convenience function for throwing app errors
export function throwError(errorType, details = {}) {
  throw new AppError(errorType, details)
}
