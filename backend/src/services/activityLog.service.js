import ActivityLog from '../models/ActivityLog.js';

/**
 * Log an activity
 * @param {Object} params - Activity log parameters
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.companyId - Company ID
 * @param {string} params.action - Action type (from enum)
 * @param {string} params.resourceType - Type of resource affected
 * @param {string} [params.resourceId] - ID of the affected resource
 * @param {string} [params.resourceTitle] - Human-readable title for the resource
 * @param {Object} [params.details] - Additional details about the action
 * @param {string} [params.ipAddress] - IP address of the user
 * @param {string} [params.userAgent] - User agent string
 */
export const logActivity = async (params) => {
  try {
    const activityLog = new ActivityLog({
      userId: params.userId,
      companyId: params.companyId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceTitle: params.resourceTitle,
      details: params.details || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - logging should not break the main flow
    return null;
  }
};

/**
 * Get activity logs for a company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.action] - Filter by action type
 * @param {string} [options.resourceType] - Filter by resource type
 * @param {string} [options.userId] - Filter by user ID
 * @param {Date} [options.startDate] - Filter by start date
 * @param {Date} [options.endDate] - Filter by end date
 */
export const getActivityLogs = async (companyId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    action,
    resourceType,
    userId,
    startDate,
    endDate,
    search
  } = options;

  const query = { companyId };

  if (action) {
    query.action = action;
  }

  if (resourceType) {
    query.resourceType = resourceType;
  }

  if (userId) {
    query.userId = userId;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;

  const logs = await ActivityLog.find(query)
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments(query);

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get activity logs for a specific resource
 * @param {string} resourceId - Resource ID
 * @param {Object} options - Query options
 */
export const getResourceActivityLogs = async (resourceId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const logs = await ActivityLog.find({ resourceId })
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments({ resourceId });

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get activity logs for a specific user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 */
export const getUserActivityLogs = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const logs = await ActivityLog.find({ userId })
    .populate('userId', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments({ userId });

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Helper function to extract request metadata
 * @param {Object} req - Express request object
 * @returns {Object} - Metadata object with ipAddress and userAgent
 */
export const getRequestMetadata = (req) => {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };
};

/**
 * Action type constants for easy reference
 */
export const ActionTypes = {
  // Team actions
  TEAM_MEMBER_ADDED: 'team_member_added',
  TEAM_MEMBER_UPDATED: 'team_member_updated',
  TEAM_MEMBER_DELETED: 'team_member_deleted',
  TEAM_MEMBER_ACTIVATED: 'team_member_activated',
  TEAM_MEMBER_DEACTIVATED: 'team_member_deactivated',
  TEAM_INVITE_RESENT: 'team_invite_resent',

  // Property actions
  PROPERTY_CREATED: 'property_created',
  PROPERTY_UPDATED: 'property_updated',
  PROPERTY_DELETED: 'property_deleted',
  PROPERTY_STATUS_CHANGED: 'property_status_changed',
  PROPERTY_PUBLISHED: 'property_published',
  PROPERTY_UNPUBLISHED: 'property_unpublished',

  // Partner actions
  PARTNER_STATUS_APPROVED: 'partner_status_approved',
  PARTNER_STATUS_REJECTED: 'partner_status_rejected',
  PARTNER_STATUS_SUSPENDED: 'partner_status_suspended',
  PARTNER_STATUS_ACTIVATED: 'partner_status_activated',
  PARTNER_TIER_CHANGED: 'partner_tier_changed',
  PARTNER_KYC_APPROVED: 'partner_kyc_approved',
  PARTNER_KYC_REJECTED: 'partner_kyc_rejected',

  // Commission actions
  COMMISSION_CREATED: 'commission_created',
  COMMISSION_UPDATED: 'commission_updated',
  COMMISSION_APPROVED: 'commission_approved',
  COMMISSION_PAID: 'commission_paid',
  COMMISSION_CANCELLED: 'commission_cancelled',

  // Agreement actions
  AGREEMENT_CREATED: 'agreement_created',
  AGREEMENT_SIGNED: 'agreement_signed',
  AGREEMENT_EXPIRED: 'agreement_expired',

  // Visit actions
  VISIT_SCHEDULED: 'visit_scheduled',
  VISIT_RESCHEDULED: 'visit_rescheduled',
  VISIT_CONFIRMED: 'visit_confirmed',
  VISIT_COMPLETED: 'visit_completed',
  VISIT_CANCELLED: 'visit_cancelled',

  // Settings actions
  SETTINGS_UPDATED: 'settings_updated',
  COMPANY_PROFILE_UPDATED: 'company_profile_updated',

  // Auth actions
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',
  PROFILE_UPDATED: 'profile_updated'
};

/**
 * Resource type constants
 */
export const ResourceTypes = {
  USER: 'user',
  TEAM_MEMBER: 'team_member',
  PROPERTY: 'property',
  PARTNER: 'partner',
  COMMISSION: 'commission',
  AGREEMENT: 'agreement',
  VISIT: 'visit',
  COMPANY: 'company',
  SETTINGS: 'settings',
  AUTH: 'auth'
};

export default {
  logActivity,
  getActivityLogs,
  getResourceActivityLogs,
  getUserActivityLogs,
  getRequestMetadata,
  ActionTypes,
  ResourceTypes
};