import env from './env';

// Log levels
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Color codes for console output (development)
const colors = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m', // Yellow
  info: '\x1b[36m', // Cyan
  debug: '\x1b[90m', // Gray
  reset: '\x1b[0m',
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.minLevel = env.app.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta,
    };

    // Production: JSON format
    if (env.app.isProduction) {
      return JSON.stringify(logEntry);
    }

    // Development: Readable format with colors
    const color = colors[level] || colors.reset;
    const metaStr = Object.keys(meta).length > 0 
      ? `\n${JSON.stringify(meta, null, 2)}` 
      : '';
    
    return `${color}${timestamp} [${level.toUpperCase()}] ${contextStr} ${message}${colors.reset}${metaStr}`;
  }

  shouldLog(level) {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.minLevel);
  }

  error(message, error = null, meta = {}) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...meta,
    } : meta;

    console.error(this.formatMessage(LogLevel.ERROR, message, errorMeta));

    // Send to external error tracking in production
    if (env.app.isProduction && error) {
      this.sendToErrorTracking(message, error, errorMeta);
    }
  }

  warn(message, meta = {}) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  info(message, meta = {}) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatMessage(LogLevel.INFO, message, meta));
  }

  debug(message, meta = {}) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
  }

  // Send errors to Sentry or other tracking service
  async sendToErrorTracking(message, error, meta) {
    try {
      // If Sentry is configured
      if (env.sentry?.dsn) {
        // Lazy load Sentry only when needed
        const Sentry = await import('@sentry/nextjs');
        
        Sentry.captureException(error, {
          contexts: {
            app: {
              context: this.context,
              message,
              ...meta,
            },
          },
        });
      }
    } catch (err) {
      console.error('Failed to send error to tracking service:', err);
    }
  }
}

// API Response helper functions
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function createAPIResponse(data, status = 200) {
  return Response.json(data, { status });
}

export function createErrorResponse(error, logger = null) {
  // Log error if logger provided
  if (logger) {
    logger.error('API Error', error);
  }

  // Handle known API errors
  if (error instanceof APIError) {
    return Response.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return Response.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.details || {},
        },
      },
      { status: 400 }
    );
  }

  // Handle Stripe errors
  if (error.type?.startsWith('Stripe')) {
    return Response.json(
      {
        error: {
          message: error.message || 'Payment processing error',
          code: 'PAYMENT_ERROR',
        },
      },
      { status: 400 }
    );
  }

  // Handle Supabase errors
  if (error.code && error.message) {
    return Response.json(
      {
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: 400 }
    );
  }

  // Generic error response (hide details in production)
  return Response.json(
    {
      error: {
        message: env.app.isProduction 
          ? 'An unexpected error occurred' 
          : error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  );
}

// Try-catch wrapper for API routes
export function withErrorHandler(handler, context = 'API') {
  return async (request, ...args) => {
    const logger = new Logger(context);
    
    try {
      return await handler(request, logger, ...args);
    } catch (error) {
      return createErrorResponse(error, logger);
    }
  };
}

// Performance monitoring wrapper
export async function withPerformanceMonitoring(fn, operationName) {
  const start = Date.now();
  const logger = new Logger('Performance');
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow operation: ${operationName}`, { duration: `${duration}ms` });
    } else {
      logger.debug(`Operation completed: ${operationName}`, { duration: `${duration}ms` });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Operation failed: ${operationName}`, error, { duration: `${duration}ms` });
    throw error;
  }
}

// Create context-specific loggers
export function createLogger(context) {
  return new Logger(context);
}

// Export default logger
export const logger = new Logger('App');

export default {
  Logger,
  createLogger,
  logger,
  APIError,
  createAPIResponse,
  createErrorResponse,
  withErrorHandler,
  withPerformanceMonitoring,
  LogLevel,
};
