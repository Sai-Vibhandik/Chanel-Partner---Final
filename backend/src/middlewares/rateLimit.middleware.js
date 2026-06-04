import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Configuration
 *
 * Implements multiple rate limiters for different endpoint types:
 * - General API limiter (all routes)
 * - Strict auth limiter (login, register, password reset)
 * - Upload limiter (file uploads)
 * - Password reset limiter (forgot-password)
 */

// Common configuration
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes default

/**
 * General API Rate Limiter
 * Applied to all API routes
 * Default: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: windowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  validate: { trustProxy: false }, // Disable trust proxy warning
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000 / 60) + ' minutes'
    });
  },
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip for health check endpoint
    return req.path === '/api/health';
  },
  // Use IP + optional user ID for rate limiting
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id;
    return userId ? `${ip}:${userId}` : ip;
  }
});

/**
 * Strict Auth Rate Limiter
 * Applied to authentication endpoints (login, register, password reset)
 * Default: 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      retryAfter: '15 minutes'
    });
  },
  // Track by IP only for auth routes
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

/**
 * Login Rate Limiter
 * More aggressive: 5 attempts per 15 minutes, then 1 hour block
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts. Your account has been temporarily locked. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again after 15 minutes or reset your password.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Registration Rate Limiter
 * Prevents bulk account creation
 * Default: 3 registrations per hour per IP
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts from this IP. Please try again after 1 hour.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Password Reset Rate Limiter
 * Prevents abuse of password reset functionality
 * Default: 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests. Please check your email or try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * File Upload Rate Limiter
 * Prevents abuse of file upload endpoints
 * Default: 20 uploads per 15 minutes per user
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  keyGenerator: (req) => {
    // If authenticated, rate limit by user ID; otherwise by IP
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress;
    return userId ? `upload:${userId}` : `upload:${ip}`;
  }
});

/**
 * Chat Message Rate Limiter
 * Prevents spam in chat
 * Default: 100 messages per minute per user
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    message: 'You are sending messages too quickly. Please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Disable trust proxy warning
  keyGenerator: (req) => {
    const userId = req.user?.id;
    return `chat:${userId}`;
  }
});

/**
 * API Key Rate Limiter (for future use)
 * Different limits for different subscription tiers
 */
export const createTierBasedLimiter = (tier = 'default') => {
  const limits = {
    free: { windowMs: 60 * 1000, max: 30 },      // 30 requests per minute
    basic: { windowMs: 60 * 1000, max: 60 },      // 60 requests per minute
    premium: { windowMs: 60 * 1000, max: 120 },  // 120 requests per minute
    enterprise: { windowMs: 60 * 1000, max: 300 } // 300 requests per minute
  };

  const config = limits[tier] || limits.default;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: `Rate limit exceeded for your plan. Please upgrade or try again later.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false } // Disable trust proxy warning
  });
};

/**
 * Socket.IO Rate Limiter middleware
 * For use with WebSocket connections
 */
export const socketRateLimiter = {
  // Store for rate limiting
  requests: new Map(),

  // Check if a client is rate limited
  isLimited: (socketId, event, limit = 10, windowMs = 10000) => {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    let requests = socketRateLimiter.requests.get(key) || [];

    // Filter out old requests
    requests = requests.filter(time => time > windowStart);

    if (requests.length >= limit) {
      return true;
    }

    // Add new request
    requests.push(now);
    socketRateLimiter.requests.set(key, requests);

    return false;
  },

  // Clean up old entries periodically
  cleanup: () => {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, times] of socketRateLimiter.requests.entries()) {
      const filtered = times.filter(time => now - time < maxAge);
      if (filtered.length === 0) {
        socketRateLimiter.requests.delete(key);
      } else {
        socketRateLimiter.requests.set(key, filtered);
      }
    }
  }
};

// Run cleanup every minute
setInterval(socketRateLimiter.cleanup, 60000);

export default {
  apiLimiter,
  authLimiter,
  loginLimiter,
  registrationLimiter,
  passwordResetLimiter,
  uploadLimiter,
  chatLimiter,
  createTierBasedLimiter,
  socketRateLimiter
};