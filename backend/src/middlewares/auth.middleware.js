import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import {
  getTokensFromRequest,
  verifyAccessToken,
  isTokenBlacklisted
} from '../utils/cookieTokens.js';
import { ApiError } from './error.middleware.js';

/**
 * Protect routes - require authentication
 * Supports both cookie-based and header-based authentication
 */
export const protect = async (req, res, next) => {
  try {
    // Get tokens from request (cookies or Authorization header)
    const { accessToken } = getTokensFromRequest(req);

    // Check if token exists
    if (!accessToken) {
      throw new ApiError(401, 'Not authorized to access this route. Please log in.');
    }

    // Check if token is blacklisted (logged out)
    if (isTokenBlacklisted(accessToken)) {
      throw new ApiError(401, 'Token has been invalidated. Please log in again.');
    }

    // Verify token - try both methods for backward compatibility
    let decoded;
    decoded = verifyAccessToken(accessToken);

    // Fallback to original token verification for backward compatibility
    if (!decoded) {
      decoded = verifyToken(accessToken);
    }

    if (!decoded) {
      throw new ApiError(401, 'Invalid token. Please log in again.');
    }

    // Ensure it's an access token, not a refresh token
    if (decoded.type && decoded.type !== 'access') {
      throw new ApiError(401, 'Invalid token type. Please log in again.');
    }

    // Get user from token
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated');
    }

    // Add user and token to request
    req.user = user;
    req.accessToken = accessToken;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth - attach user if token present
 * Supports both cookie-based and header-based authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const { accessToken } = getTokensFromRequest(req);

    if (accessToken && !isTokenBlacklisted(accessToken)) {
      let decoded = verifyAccessToken(accessToken);

      // Fallback for backward compatibility
      if (!decoded) {
        decoded = verifyToken(accessToken);
      }

      if (decoded && decoded.type !== 'refresh') {
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
          req.accessToken = accessToken;
        }
      }
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth
    next();
  }
};

/**
 * Restrict to specific roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
};

/**
 * Restrict to platform admin only
 */
export const platformAdminOnly = (req, res, next) => {
  if (req.user.role !== 'platform_admin') {
    throw new ApiError(403, 'This action is restricted to platform administrators');
  }
  next();
};

/**
 * Restrict to company superadmin only
 */
export const companySuperAdminOnly = (req, res, next) => {
  if (req.user.role !== 'company_superadmin' && req.user.role !== 'platform_admin') {
    throw new ApiError(403, 'This action is restricted to company administrators');
  }
  next();
};

/**
 * Check if user belongs to company (multi-tenancy)
 */
export const checkCompanyAccess = (req, res, next) => {
  // Platform admin can access all
  if (req.user.role === 'platform_admin') {
    return next();
  }

  // For company users, check if they're accessing their own company's data
  // Support both 'id' and 'companyId' as parameter names
  const requestedCompanyId = req.params.id || req.params.companyId || req.body.companyId || req.query.companyId;

  if (requestedCompanyId && requestedCompanyId.toString() !== req.user.companyId?.toString()) {
    throw new ApiError(403, 'You do not have access to this company');
  }

  next();
};

/**
 * Add company scope to query (multi-tenancy)
 */
export const addCompanyScope = (req, res, next) => {
  // Platform admin can see all
  if (req.user.role === 'platform_admin') {
    return next();
  }

  // Add companyId to query for filtering
  req.query.companyId = req.user.companyId;

  // Also add to body for create/update operations
  if (req.body && !req.body.companyId) {
    req.body.companyId = req.user.companyId;
  }

  next();
};

/**
 * Role permissions map
 */
const rolePermissions = {
  platform_admin: ['all_platform'],

  company_superadmin: ['all_company'],

  partner_manager: [
    'view_partners',
    'manage_partners',
    'view_analytics'
  ],

  property_manager: [
    'view_properties',
    'manage_properties',
    'view_suggestions',
    'manage_suggestions',
    'view_analytics'
  ],

  finance_manager: [
    'view_commissions',
    'manage_commissions',
    'view_analytics'
  ],

  viewer: [
    'view_analytics'
  ],

  partner: [
    'view_properties',
    'book_visits',
    'view_own_commissions',
    'chat_with_admin',
    'sign_agreements',
    'manage_own_profile',
    'submit_suggestions'
  ]
};

/**
 * Check specific permission
 */
export const hasPermission = (permission) => {
  return (req, res, next) => {
    // Platform admin has all permissions
    if (req.user.role === 'platform_admin') {
      return next();
    }

    // Company superadmin has all company permissions
    if (req.user.role === 'company_superadmin') {
      return next();
    }

    const permissions = rolePermissions[req.user.role] || [];

    if (!permissions.includes(permission)) {
      throw new ApiError(403, `Permission '${permission}' is required`);
    }

    next();
  };
};