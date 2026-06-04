import { getActivityLogs, getResourceActivityLogs, getUserActivityLogs } from '../services/activityLog.service.js';

// Major activity types that viewers can see
const MAJOR_ACTIVITIES = [
  'commission_approved',
  'commission_paid',
  'partner_status_approved',
  'partner_kyc_approved',
  'visit_completed',
  'property_published',
  'agreement_signed'
];

/**
 * Get recent major activities for the company (for viewers)
 * @route GET /api/activity-logs/recent
 */
export const getRecentActivities = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { limit = 10 } = req.query;

    const result = await getActivityLogs(companyId, {
      page: 1,
      limit: parseInt(limit),
      action: MAJOR_ACTIVITIES
    });

    // Format activities for display
    const activities = result.logs.map(log => ({
      id: log._id,
      action: log.action,
      resourceType: log.resourceType,
      resourceTitle: log.resourceTitle,
      details: log.details,
      userId: log.userId,
      userName: log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() : 'System',
      timestamp: log.timestamp
    }));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

/**
 * Get activity logs for the company
 * @route GET /api/activity-logs
 */
export const getActivityLogsList = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      page = 1,
      limit = 20,
      action,
      resourceType,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const result = await getActivityLogs(companyId, {
      page,
      limit,
      action,
      resourceType,
      userId,
      startDate,
      endDate,
      search
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

/**
 * Get activity logs for a specific resource
 * @route GET /api/activity-logs/resource/:resourceId
 */
export const getResourceLogs = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await getResourceActivityLogs(resourceId, { page, limit });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching resource activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource activity logs',
      error: error.message
    });
  }
};

/**
 * Get activity logs for the current user
 * @route GET /api/activity-logs/my-activity
 */
export const getMyActivityLogs = async (req, res) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const result = await getUserActivityLogs(userId, { page, limit });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity logs',
      error: error.message
    });
  }
};

/**
 * Get action types and resource types for filters
 * @route GET /api/activity-logs/types
 */
export const getActivityTypes = async (req, res) => {
  try {
    const ActionTypes = {
      TEAM_MEMBER_ADDED: 'team_member_added',
      TEAM_MEMBER_UPDATED: 'team_member_updated',
      TEAM_MEMBER_DELETED: 'team_member_deleted',
      TEAM_MEMBER_ACTIVATED: 'team_member_activated',
      TEAM_MEMBER_DEACTIVATED: 'team_member_deactivated',
      TEAM_INVITE_RESENT: 'team_invite_resent',
      PROPERTY_CREATED: 'property_created',
      PROPERTY_UPDATED: 'property_updated',
      PROPERTY_DELETED: 'property_deleted',
      PROPERTY_STATUS_CHANGED: 'property_status_changed',
      PROPERTY_PUBLISHED: 'property_published',
      PROPERTY_UNPUBLISHED: 'property_unpublished',
      PARTNER_STATUS_APPROVED: 'partner_status_approved',
      PARTNER_STATUS_REJECTED: 'partner_status_rejected',
      PARTNER_STATUS_SUSPENDED: 'partner_status_suspended',
      PARTNER_STATUS_ACTIVATED: 'partner_status_activated',
      PARTNER_TIER_CHANGED: 'partner_tier_changed',
      PARTNER_KYC_APPROVED: 'partner_kyc_approved',
      PARTNER_KYC_REJECTED: 'partner_kyc_rejected',
      COMMISSION_CREATED: 'commission_created',
      COMMISSION_UPDATED: 'commission_updated',
      COMMISSION_APPROVED: 'commission_approved',
      COMMISSION_PAID: 'commission_paid',
      COMMISSION_CANCELLED: 'commission_cancelled',
      AGREEMENT_CREATED: 'agreement_created',
      AGREEMENT_SIGNED: 'agreement_signed',
      AGREEMENT_EXPIRED: 'agreement_expired',
      VISIT_SCHEDULED: 'visit_scheduled',
      VISIT_RESCHEDULED: 'visit_rescheduled',
      VISIT_CONFIRMED: 'visit_confirmed',
      VISIT_COMPLETED: 'visit_completed',
      VISIT_CANCELLED: 'visit_cancelled',
      SETTINGS_UPDATED: 'settings_updated',
      COMPANY_PROFILE_UPDATED: 'company_profile_updated',
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILED: 'login_failed',
      PASSWORD_CHANGED: 'password_changed',
      PROFILE_UPDATED: 'profile_updated'
    };

    const ResourceTypes = {
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

    res.json({
      success: true,
      data: {
        actionTypes: Object.values(ActionTypes),
        resourceTypes: Object.values(ResourceTypes)
      }
    });
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity types',
      error: error.message
    });
  }
};

export default {
  getActivityLogsList,
  getResourceLogs,
  getMyActivityLogs,
  getActivityTypes
};