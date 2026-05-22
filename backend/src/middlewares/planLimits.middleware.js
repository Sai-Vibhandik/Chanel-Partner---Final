import {
  canCreateProperty,
  hasCapability,
  isSubscriptionActive,
  getLimitsAndUsage
} from '../services/planLimits.service.js';
import { ApiError } from './error.middleware.js';

/**
 * Middleware to check if subscription is active
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return next(); // Skip for platform admin
    }

    const isActive = await isSubscriptionActive(companyId);

    if (!isActive) {
      throw new ApiError(402, 'Your subscription has expired. Please renew to continue using this feature.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check property creation limit
 */
export const checkPropertyLimit = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return next(); // Skip for platform admin
    }

    await canCreateProperty(companyId);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check capability
 * @param {string} capability - The capability to check
 */
export const requireCapability = (capability) => {
  return async (req, res, next) => {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return next(); // Skip for platform admin
      }

      await hasCapability(companyId, capability);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to attach plan limits and usage to request
 * Useful for routes that need to display limits info
 */
export const attachPlanLimits = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return next(); // Skip for platform admin
    }

    req.planLimits = await getLimitsAndUsage(companyId);
    next();
  } catch (error) {
    // Don't fail the request, just don't attach limits
    next();
  }
};

/**
 * Utility to get remaining limits for a company
 */
export const getRemainingLimits = async (companyId) => {
  try {
    const limitsAndUsage = await getLimitsAndUsage(companyId);
    return {
      properties: limitsAndUsage.limits.properties.remaining,
      days: limitsAndUsage.limits.days.remaining
    };
  } catch (error) {
    return null;
  }
};

export default {
  requireActiveSubscription,
  checkPropertyLimit,
  requireCapability,
  attachPlanLimits,
  getRemainingLimits
};