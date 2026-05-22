import Company from '../models/Company.js';
import Plan from '../models/Plan.js';
import Property from '../models/Property.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * Plan Limits Service
 * Enforces subscription plan limits and feature restrictions
 */

/**
 * Get company's current plan with limits
 */
export const getCompanyPlan = async (companyId) => {
  const company = await Company.findById(companyId)
    .populate('subscription.planId');

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  // Get plan limits
  let plan = company.subscription?.planId;

  // If no plan assigned, use default trial limits
  if (!plan) {
    plan = {
      limits: {
        maxProperties: 10,
        maxDays: 14 // 14-day trial
      },
      capabilities: {
        analytics: true,
        advancedAnalytics: false,
        apiAccess: false,
        whiteLabel: false,
        customDomain: false,
        prioritySupport: false,
        dedicatedManager: false
      }
    };
  }

  return {
    plan,
    status: company.subscription?.status || 'trial',
    trialEndsAt: company.subscription?.trialEndsAt,
    currentPeriodEnd: company.subscription?.currentPeriodEnd
  };
};

/**
 * Check if subscription is active
 */
export const isSubscriptionActive = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  const status = company.subscription?.status;

  // Active subscription
  if (status === 'active') {
    return true;
  }

  // Trial subscription - check if still valid
  if (status === 'trial') {
    const trialEnds = company.subscription?.trialEndsAt;
    if (trialEnds && new Date(trialEnds) > new Date()) {
      return true;
    }
  }

  return false;
};

/**
 * Get remaining days in subscription
 */
export const getRemainingDays = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  const periodEnd = company.subscription?.currentPeriodEnd || company.subscription?.trialEndsAt;

  if (!periodEnd) {
    return 0;
  }

  const now = new Date();
  const end = new Date(periodEnd);
  const diffMs = end - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Get current property count for a company
 */
export const getPropertyCount = async (companyId) => {
  const count = await Property.countDocuments({ companyId, status: { $ne: 'archived' } });
  return count;
};

/**
 * Check if company can create more properties
 */
export const canCreateProperty = async (companyId) => {
  const { plan } = await getCompanyPlan(companyId);

  // Check subscription status
  if (!await isSubscriptionActive(companyId)) {
    throw new ApiError(402, 'Your subscription has expired. Please renew to add more properties.');
  }

  const currentCount = await getPropertyCount(companyId);
  const limit = plan.limits.maxProperties;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, remaining: 'unlimited', used: currentCount, limit: 'unlimited' };
  }

  if (currentCount >= limit) {
    throw new ApiError(402, `Property limit reached. Your plan allows ${limit} properties. Please upgrade to add more.`);
  }

  return {
    allowed: true,
    remaining: limit - currentCount,
    used: currentCount,
    limit
  };
};

/**
 * Check if company has a specific capability
 */
export const hasCapability = async (companyId, capability) => {
  const { plan } = await getCompanyPlan(companyId);

  // Check subscription status
  if (!await isSubscriptionActive(companyId)) {
    throw new ApiError(402, 'Your subscription has expired. Please renew to access this feature.');
  }

  const capabilities = plan.capabilities || {};

  if (!capabilities[capability]) {
    const capabilityNames = {
      analytics: 'Analytics',
      advancedAnalytics: 'Advanced Analytics',
      apiAccess: 'API Access',
      whiteLabel: 'White Label',
      customDomain: 'Custom Domain',
      prioritySupport: 'Priority Support',
      dedicatedManager: 'Dedicated Manager'
    };

    throw new ApiError(402, `${capabilityNames[capability] || capability} is not available in your plan. Please upgrade to access this feature.`);
  }

  return true;
};

/**
 * Get full limits and usage summary for a company
 */
export const getLimitsAndUsage = async (companyId) => {
  const { plan, status, trialEndsAt, currentPeriodEnd } = await getCompanyPlan(companyId);
  const propertyCount = await getPropertyCount(companyId);
  const isActive = await isSubscriptionActive(companyId);
  const remainingDays = await getRemainingDays(companyId);

  return {
    subscription: {
      status,
      isActive,
      trialEndsAt,
      currentPeriodEnd,
      remainingDays,
      plan: plan.name || 'Trial'
    },
    limits: {
      properties: {
        limit: plan.limits.maxProperties,
        used: propertyCount,
        remaining: plan.limits.maxProperties === -1 ? 'unlimited' : Math.max(0, plan.limits.maxProperties - propertyCount),
        percentage: plan.limits.maxProperties === -1 ? 0 : Math.round((propertyCount / plan.limits.maxProperties) * 100)
      },
      days: {
        limit: plan.limits.maxDays,
        remaining: remainingDays,
        percentage: plan.limits.maxDays ? Math.round(((plan.limits.maxDays - remainingDays) / plan.limits.maxDays) * 100) : 0
      }
    },
    capabilities: plan.capabilities
  };
};

/**
 * Get company subscription status details
 * Returns full subscription info including expiry status
 */
export const getCompanySubscriptionStatus = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  const status = company.subscription?.status;
  const isActive = await isSubscriptionActive(companyId);

  return {
    status,
    isActive,
    isExpired: !isActive,
    trialEndsAt: company.subscription?.trialEndsAt,
    currentPeriodEnd: company.subscription?.currentPeriodEnd,
    planId: company.subscription?.planId
  };
};

/**
 * Check if company is accepting new partners
 * Returns false if subscription is expired
 */
export const isCompanyAcceptingPartners = async (companyId) => {
  const company = await Company.findById(companyId);

  if (!company) {
    return false;
  }

  // Company must be active
  if (company.status !== 'active') {
    return false;
  }

  // Subscription must be active or trial
  const subscriptionStatus = company.subscription?.status;
  if (!['active', 'trial'].includes(subscriptionStatus)) {
    return false;
  }

  // If trial, check if trial is still valid
  if (subscriptionStatus === 'trial') {
    const trialEnds = company.subscription?.trialEndsAt;
    if (trialEnds && new Date(trialEnds) < new Date()) {
      return false;
    }
  }

  return true;
};

/**
 * Get list of active company IDs (for filtering)
 * Returns only company IDs with active subscriptions
 */
export const getActiveCompanyIds = async () => {
  const now = new Date();

  const companies = await Company.find({
    status: 'active',
    $or: [
      { 'subscription.status': 'active' },
      {
        'subscription.status': 'trial',
        'subscription.trialEndsAt': { $gt: now }
      }
    ]
  }).select('_id');

  return companies.map(c => c._id);
};

export default {
  getCompanyPlan,
  isSubscriptionActive,
  getRemainingDays,
  getPropertyCount,
  canCreateProperty,
  hasCapability,
  getLimitsAndUsage,
  getCompanySubscriptionStatus,
  isCompanyAcceptingPartners,
  getActiveCompanyIds
};