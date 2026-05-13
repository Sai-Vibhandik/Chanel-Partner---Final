import jwt from 'jsonwebtoken';

/**
 * Cookie Token Utilities
 *
 * Handles secure cookie-based JWT token management
 * - Access tokens in httpOnly cookies (short-lived)
 * - Refresh tokens in httpOnly cookies (long-lived)
 */

/**
 * Cookie options for different environments
 */
const getCookieOptions = (isProduction = false) => {
  const baseOptions = {
    httpOnly: true,      // Cannot be accessed by JavaScript
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/',           // Available on all routes
  };

  return {
    access: {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    },
    refresh: {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    clear: {
      ...baseOptions,
      maxAge: 0,
    }
  };
};

/**
 * Generate access token (short-lived)
 * @param {Object} payload - User data to encode
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} payload - User data to encode
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Set authentication cookies on response
 * @param {Object} res - Express response object
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = getCookieOptions(isProduction);

  // Set access token cookie
  res.cookie('accessToken', accessToken, options.access);

  // Set refresh token cookie
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, options.refresh);
  }
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = getCookieOptions(isProduction);

  res.clearCookie('accessToken', options.clear);
  res.clearCookie('refreshToken', options.clear);
};

/**
 * Get tokens from request (cookies or Authorization header fallback)
 * @param {Object} req - Express request object
 * @returns {Object} { accessToken, refreshToken }
 */
export const getTokensFromRequest = (req) => {
  // First try cookies
  const accessToken = req.cookies?.accessToken ||
                      req.signedCookies?.accessToken;

  const refreshToken = req.cookies?.refreshToken ||
                       req.signedCookies?.refreshToken;

  // Fallback to Authorization header for API clients
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  return {
    accessToken: accessToken || headerToken,
    refreshToken
  };
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
  } catch (error) {
    return null;
  }
};

/**
 * Token blacklist for logout functionality
 * In production, use Redis for this
 */
const tokenBlacklist = new Set();

/**
 * Add token to blacklist (for logout)
 * @param {string} token - Token to blacklist
 */
export const blacklistToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
    // Auto-remove after token expiration (15 minutes for access tokens)
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, 15 * 60 * 1000);
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - Token to check
 * @returns {boolean} True if blacklisted
 */
export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Clear all tokens for a user (for logout all sessions)
 * In production, implement with Redis
 * @param {string} userId - User ID to clear tokens for
 */
export const clearAllUserTokens = (userId) => {
  // In production, use Redis to store user tokens and clear them
  // For now, this is a placeholder
  console.log(`Clearing all tokens for user: ${userId}`);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getTokensFromRequest,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  clearAllUserTokens
};