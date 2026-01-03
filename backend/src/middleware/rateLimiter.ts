// backend/src/middleware/rateLimiter.ts - COMPLETE SECURE VERSION
import rateLimit from 'express-rate-limit';

// ========================================
// Auth endpoints rate limiter - CRITICAL FOR SECURITY
// ========================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: {
    error: 'Too many authentication attempts from this IP, please try again later',
    retryAfter: 15 * 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    console.warn(`🚨 Rate limit hit for auth: ${req.ip} - ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    });
  },
});

// ========================================
// Upload rate limiter - Prevent abuse
// ========================================
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute per IP
  message: {
    error: 'Too many upload attempts, please slow down',
    retryAfter: 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit hit for uploads: ${req.ip}`);
    res.status(429).json({
      error: 'Too many upload attempts, please wait a minute before trying again',
    });
  },
});

// ========================================
// General API rate limiter
// ========================================
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: 'Too many requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit hit for API: ${req.ip} - ${req.path}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please slow down',
    });
  },
});

// ========================================
// Strict limiter for sensitive operations
// ========================================
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP
  message: {
    error: 'Rate limit exceeded for this operation',
    retryAfter: 60 * 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Strict rate limit hit: ${req.ip} - ${req.path}`);
    res.status(429).json({
      error: 'Rate limit exceeded for this sensitive operation, please try again later',
    });
  },
});

// ========================================
// Search rate limiter
// ========================================
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute per IP
  message: {
    error: 'Too many search requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit hit for search: ${req.ip}`);
    res.status(429).json({
      error: 'Too many search requests, please wait before searching again',
    });
  },
});

// ========================================
// Export all limiters
// ========================================
export default {
  authLimiter,
  uploadLimiter,
  apiLimiter,
  strictLimiter,
  searchLimiter,
};
