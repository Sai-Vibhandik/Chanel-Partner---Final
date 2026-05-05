import User from '../models/User.js';
import Property from '../models/Property.js';
import PartnerCompany from '../models/PartnerCompany.js';
import Visit from '../models/Visit.js';
import Commission from '../models/Commission.js';
import LoginLog from '../models/LoginLog.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * Get date range based on period type
 */
const getDateRange = (period, customStart, customEnd) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      endDate = now;
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      endDate = now;
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      endDate = now;
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now);
      endDate = customEnd ? new Date(customEnd) : now;
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      endDate = now;
  }

  return { startDate, endDate };
};

/**
 * Get previous period date range for comparison
 */
const getPreviousPeriod = (startDate, endDate) => {
  const duration = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setTime(previousEnd.getTime() - duration);
  return { previousStart, previousEnd };
};

/**
 * @desc    Get analytics overview
 * @route   GET /api/analytics/overview
 * @access  Private (Company SuperAdmin)
 */
export const getOverview = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period);
    const { previousStart, previousEnd } = getPreviousPeriod(startDate, endDate);

    // Fetch all stats in parallel
    const [
      currentPartners,
      previousPartners,
      currentProperties,
      previousProperties,
      currentVisits,
      previousVisits,
      currentCommissions,
      previousCommissions,
      activePartners,
      totalPartners,
      pendingApprovals,
      kycStats
    ] = await Promise.all([
      // Current period registrations
      User.countDocuments({
        companyId,
        role: 'partner',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Previous period registrations
      User.countDocuments({
        companyId,
        role: 'partner',
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      // Current period properties
      Property.countDocuments({
        companyId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Previous period properties
      Property.countDocuments({
        companyId,
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      // Current period visits
      Visit.countDocuments({
        companyId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Previous period visits
      Visit.countDocuments({
        companyId,
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      // Current period commissions
      Commission.countDocuments({
        companyId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Previous period commissions
      Commission.countDocuments({
        companyId,
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      // Active partners
      PartnerCompany.countDocuments({ companyId, status: 'active' }),
      // Total partners
      PartnerCompany.countDocuments({ companyId }),
      // Pending approvals
      PartnerCompany.countDocuments({ companyId, status: 'pending' }),
      // KYC stats
      PartnerCompany.aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: '$kycStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Calculate approval rate
    const totalProcessed = totalPartners - pendingApprovals;
    const approvedPartners = activePartners;
    const approvalRate = totalProcessed > 0 ? Math.round((approvedPartners / totalProcessed) * 100) : 0;

    // Format KYC stats
    const kycStatsMap = {
      pending: 0,
      submitted: 0,
      under_review: 0,
      verified: 0,
      rejected: 0
    };
    kycStats.forEach(stat => {
      if (stat._id && kycStatsMap.hasOwnProperty(stat._id)) {
        kycStatsMap[stat._id] = stat.count;
      }
    });

    res.json({
      success: true,
      data: {
        partners: {
          total: totalPartners,
          active: activePartners,
          pending: pendingApprovals,
          newThisPeriod: currentPartners,
          change: calculateChange(currentPartners, previousPartners)
        },
        properties: {
          newThisPeriod: currentProperties,
          change: calculateChange(currentProperties, previousProperties)
        },
        visits: {
          newThisPeriod: currentVisits,
          change: calculateChange(currentVisits, previousVisits)
        },
        commissions: {
          newThisPeriod: currentCommissions,
          change: calculateChange(currentCommissions, previousCommissions)
        },
        approvalRate,
        kycStats: kycStatsMap,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get registration trends
 * @route   GET /api/analytics/registrations
 * @access  Private (Company SuperAdmin)
 */
export const getRegistrationTrends = async (req, res, next) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Determine grouping format based on period
    let dateFormat;
    let groupBy;
    if (period === 'week') {
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (period === 'year') {
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    } else {
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    // Get registration trends
    const trends = await User.aggregate([
      {
        $match: {
          companyId,
          role: 'partner',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          date: { $first: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Get registrations by status
    const byStatus = await PartnerCompany.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get registrations by tier
    const byTier = await PartnerCompany.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get registrations by region (from User's partnerProfile)
    const byRegion = await User.aggregate([
      {
        $match: {
          companyId,
          role: 'partner'
        }
      },
      {
        $group: {
          _id: '$partnerProfile.operatingRegion',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get actual registration records for table
    const records = await User.aggregate([
      {
        $match: {
          companyId,
          role: 'partner',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'partnercompanies',
          localField: '_id',
          foreignField: 'partnerId',
          as: 'partnership'
        }
      },
      { $unwind: { path: '$partnership', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          createdAt: 1,
          status: '$partnership.status',
          tier: '$partnership.tier',
          kycStatus: '$partnership.kycStatus'
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 }
    ]);

    // Format status data
    const statusMap = { pending: 0, active: 0, suspended: 0 };
    byStatus.forEach(item => {
      if (item._id && statusMap.hasOwnProperty(item._id)) {
        statusMap[item._id] = item.count;
      }
    });

    // Format tier data
    const tierMap = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    byTier.forEach(item => {
      if (item._id && tierMap.hasOwnProperty(item._id)) {
        tierMap[item._id] = item.count;
      }
    });

    // Format region data
    const regionData = {};
    byRegion.forEach(item => {
      if (item._id) {
        regionData[item._id] = item.count;
      }
    });

    // Format trends data
    const formattedTrends = trends.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.json({
      success: true,
      data: {
        trends: formattedTrends,
        byStatus: statusMap,
        byTier: tierMap,
        byRegion: regionData,
        records,
        period: {
          start: startDate,
          end: endDate,
          type: period
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get approval reports
 * @route   GET /api/analytics/approvals
 * @access  Private (Company SuperAdmin)
 */
export const getApprovalReports = async (req, res, next) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Get approval stats
    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      suspendedApplications,
      approvalTrends,
      avgApprovalTime,
      rejectionReasons
    ] = await Promise.all([
      // Total applications
      PartnerCompany.countDocuments({ companyId }),
      // Pending
      PartnerCompany.countDocuments({ companyId, status: 'pending' }),
      // Active
      PartnerCompany.countDocuments({ companyId, status: 'active' }),
      // Suspended
      PartnerCompany.countDocuments({ companyId, status: 'suspended' }),
      // Approval trends over time
      PartnerCompany.aggregate([
        {
          $match: {
            companyId,
            approvedAt: { $ne: null, $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$approvedAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Average approval time
      PartnerCompany.aggregate([
        {
          $match: {
            companyId,
            approvedAt: { $ne: null }
          }
        },
        {
          $project: {
            approvalTime: {
              $divide: [
                { $subtract: ['$approvedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert ms to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$approvalTime' },
            minDays: { $min: '$approvalTime' },
            maxDays: { $max: '$approvalTime' }
          }
        }
      ]),
      // Rejection/suspension reasons
      PartnerCompany.aggregate([
        {
          $match: {
            companyId,
            rejectionReason: { $ne: null }
          }
        },
        {
          $group: {
            _id: '$rejectionReason',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate approval rate
    const processedApplications = approvedApplications + suspendedApplications;
    const approvalRate = processedApplications > 0
      ? Math.round((approvedApplications / processedApplications) * 100)
      : 0;

    // Format approval trends
    const formattedTrends = approvalTrends.map(item => ({
      date: item._id,
      count: item.count
    }));

    // Format approval time
    const approvalTimeStats = avgApprovalTime[0] || { avgDays: 0, minDays: 0, maxDays: 0 };

    // Format rejection reasons
    const formattedReasons = rejectionReasons.map(item => ({
      reason: item._id,
      count: item.count
    }));

    // Get approval records for table
    const records = await PartnerCompany.aggregate([
      { $match: { companyId } },
      {
        $lookup: {
          from: 'users',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partner'
        }
      },
      { $unwind: { path: '$partner', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          partnerId: 1,
          partnerName: { $concat: ['$partner.firstName', ' ', '$partner.lastName'] },
          partnerEmail: '$partner.email',
          status: 1,
          tier: 1,
          createdAt: 1,
          approvedAt: 1,
          kycStatus: 1,
          rejectionReason: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          suspended: suspendedApplications,
          approvalRate
        },
        trends: formattedTrends,
        averageApprovalTime: Math.round(approvalTimeStats.avgDays || 0),
        approvalTimeStats: {
          average: Math.round(approvalTimeStats.avgDays || 0),
          min: Math.round(approvalTimeStats.minDays || 0),
          max: Math.round(approvalTimeStats.maxDays || 0)
        },
        rejectionReasons: formattedReasons,
        records,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get login activity reports
 * @route   GET /api/analytics/logins
 * @access  Private (Company SuperAdmin)
 */
export const getLoginActivity = async (req, res, next) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);
    const { previousStart, previousEnd } = getPreviousPeriod(startDate, endDate);

    const [
      totalLogins,
      previousLogins,
      successfulLogins,
      failedLogins,
      uniqueUsers,
      loginsByDay,
      loginsByHour,
      deviceStats,
      browserStats,
      osStats,
      failedReasons
    ] = await Promise.all([
      // Total logins in period
      LoginLog.countDocuments({
        companyId,
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      // Previous period logins
      LoginLog.countDocuments({
        companyId,
        timestamp: { $gte: previousStart, $lte: previousEnd }
      }),
      // Successful logins
      LoginLog.countDocuments({
        companyId,
        status: 'success',
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      // Failed logins
      LoginLog.countDocuments({
        companyId,
        status: 'failed',
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      // Unique users
      LoginLog.distinct('userId', {
        companyId,
        status: 'success',
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      // Logins by day
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            total: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Logins by hour of day
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            status: 'success',
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Device stats
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$device.type',
            count: { $sum: 1 }
          }
        }
      ]),
      // Browser stats
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$browser.name',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // OS stats
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$os.name',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // Failed login reasons
      LoginLog.aggregate([
        {
          $match: {
            companyId,
            status: 'failed',
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$failureReason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Calculate change
    const change = previousLogins > 0
      ? Math.round(((totalLogins - previousLogins) / previousLogins) * 100)
      : (totalLogins > 0 ? 100 : 0);

    // Format device stats
    const deviceMap = { desktop: 0, mobile: 0, tablet: 0 };
    deviceStats.forEach(item => {
      if (item._id && deviceMap.hasOwnProperty(item._id)) {
        deviceMap[item._id] = item.count;
      }
    });

    // Format browser stats
    const browserData = browserStats
      .filter(item => item._id)
      .map(item => ({ name: item._id, count: item.count }));

    // Format OS stats
    const osData = osStats
      .filter(item => item._id)
      .map(item => ({ name: item._id, count: item.count }));

    // Format hourly data (fill missing hours with 0)
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const found = loginsByHour.find(item => item._id === i);
      return { hour: i, count: found ? found.count : 0 };
    });

    // Format daily trends
    const dailyTrends = loginsByDay.map(item => ({
      date: item._id,
      total: item.total,
      successful: item.successful,
      failed: item.failed
    }));

    // Format failure reasons
    const failureReasonsData = failedReasons
      .filter(item => item._id)
      .map(item => ({ reason: item._id.replace(/_/g, ' '), count: item.count }));

    // Get login records for table
    const records = await LoginLog.find({
      companyId,
      timestamp: { $gte: startDate, $lte: endDate }
    })
      .populate('userId', 'firstName lastName email role')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: {
        summary: {
          total: totalLogins,
          successful: successfulLogins,
          failed: failedLogins,
          uniqueUsers: uniqueUsers.length,
          change
        },
        trends: dailyTrends,
        byHour: hourlyData,
        byDevice: deviceMap,
        byBrowser: browserData,
        byOS: osData,
        failureReasons: failureReasonsData,
        records,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get property growth reports
 * @route   GET /api/analytics/properties
 * @access  Private (Company SuperAdmin)
 */
export const getPropertyReports = async (req, res, next) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);
    const { previousStart, previousEnd } = getPreviousPeriod(startDate, endDate);

    const [
      totalProperties,
      previousTotal,
      activeProperties,
      draftProperties,
      soldProperties,
      byType,
      byStatus,
      byRegion,
      growthTrends,
      visibilityStats
    ] = await Promise.all([
      // Total properties
      Property.countDocuments({ companyId }),
      // Previous total
      Property.countDocuments({
        companyId,
        createdAt: { $lt: startDate }
      }),
      // Active
      Property.countDocuments({ companyId, status: 'active' }),
      // Draft
      Property.countDocuments({ companyId, status: 'draft' }),
      // Sold
      Property.countDocuments({ companyId, status: 'sold_out' }),
      // By type
      Property.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      // By status
      Property.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // By region
      Property.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$region', count: { $sum: 1 } } }
      ]),
      // Growth trends
      Property.aggregate([
        {
          $match: {
            companyId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Visibility stats
      Property.aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: '$visibility.type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate new properties this period
    const newProperties = totalProperties - previousTotal;
    const change = previousTotal > 0
      ? Math.round((newProperties / previousTotal) * 100)
      : (newProperties > 0 ? 100 : 0);

    // Format type data
    const typeData = {};
    byType.forEach(item => {
      if (item._id) typeData[item._id] = item.count;
    });

    // Format status data
    const statusData = {};
    byStatus.forEach(item => {
      if (item._id) statusData[item._id] = item.count;
    });

    // Format region data
    const regionData = {};
    byRegion.forEach(item => {
      if (item._id) regionData[item._id] = item.count;
    });

    // Format visibility data
    const visibilityData = {};
    visibilityStats.forEach(item => {
      const key = item._id || 'all';
      visibilityData[key] = item.count;
    });

    // Format growth trends
    const formattedTrends = growthTrends.map(item => ({
      date: item._id,
      count: item.count
    }));

    // Get property records for table
    const records = await Property.find({ companyId })
      .select('name type status region pricing createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: {
        summary: {
          total: totalProperties,
          active: activeProperties,
          draft: draftProperties,
          sold: soldProperties,
          newThisPeriod: newProperties,
          change
        },
        byType: typeData,
        byStatus: statusData,
        byRegion: regionData,
        byVisibility: visibilityData,
        trends: formattedTrends,
        records,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get commission reports
 * @route   GET /api/analytics/commissions
 * @access  Private (Company SuperAdmin)
 */
export const getCommissionReports = async (req, res, next) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const companyId = req.user.companyId;

    const { startDate, endDate } = getDateRange(period, customStart, customEnd);
    const { previousStart, previousEnd } = getPreviousPeriod(startDate, endDate);

    const [
      totalCommissions,
      previousTotal,
      byStatus,
      byTier,
      byCurrency,
      trends,
      topPartners,
      totalAmount,
      pendingAmount,
      paidAmount
    ] = await Promise.all([
      // Total commissions in period
      Commission.countDocuments({
        companyId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Previous period count
      Commission.countDocuments({
        companyId,
        createdAt: { $gte: previousStart, $lte: previousEnd }
      }),
      // By status
      Commission.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // By tier
      Commission.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$commission.partnerTier', count: { $sum: 1 }, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // By currency
      Commission.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$commission.currency', count: { $sum: 1 }, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // Trends over time
      Commission.aggregate([
        {
          $match: {
            companyId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            amount: { $sum: '$commission.calculatedAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Top partners by commission
      Commission.aggregate([
        { $match: { companyId, status: { $in: ['approved', 'paid'] } } },
        {
          $group: {
            _id: '$partner',
            totalAmount: { $sum: '$commission.calculatedAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'partner'
          }
        },
        { $unwind: '$partner' },
        {
          $project: {
            partnerId: '$_id',
            name: { $concat: ['$partner.firstName', ' ', '$partner.lastName'] },
            totalAmount: 1,
            count: 1
          }
        }
      ]),
      // Total amount
      Commission.aggregate([
        { $match: { companyId } },
        { $group: { _id: null, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // Pending amount
      Commission.aggregate([
        { $match: { companyId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$commission.calculatedAmount' } } }
      ]),
      // Paid amount
      Commission.aggregate([
        { $match: { companyId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$commission.calculatedAmount' } } }
      ])
    ]);

    // Calculate change
    const change = previousTotal > 0
      ? Math.round(((totalCommissions - previousTotal) / previousTotal) * 100)
      : (totalCommissions > 0 ? 100 : 0);

    // Format status data
    const statusData = { pending: { count: 0, amount: 0 }, approved: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 } };
    byStatus.forEach(item => {
      if (item._id && statusData.hasOwnProperty(item._id)) {
        statusData[item._id] = { count: item.count, amount: item.total || 0 };
      }
    });

    // Format tier data
    const tierData = {};
    byTier.forEach(item => {
      if (item._id) {
        tierData[item._id] = { count: item.count, amount: item.total || 0 };
      }
    });

    // Format currency data
    const currencyData = {};
    byCurrency.forEach(item => {
      if (item._id) {
        currencyData[item._id] = { count: item.count, amount: item.total || 0 };
      }
    });

    // Format trends
    const formattedTrends = trends.map(item => ({
      date: item._id,
      count: item.count,
      amount: item.amount || 0
    }));

    // Format top partners
    const topPartnersData = topPartners.map(item => ({
      partnerId: item.partnerId,
      name: item.name,
      totalAmount: item.totalAmount,
      count: item.count
    }));

    // Get commission records for table
    const records = await Commission.find({ companyId })
      .populate('partner', 'firstName lastName email')
      .populate('property', 'name')
      .select('partner property commission status saleDetails createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: {
        summary: {
          total: totalCommissions,
          change,
          totalAmount: totalAmount[0]?.total || 0,
          pendingAmount: pendingAmount[0]?.total || 0,
          paidAmount: paidAmount[0]?.total || 0
        },
        byStatus: statusData,
        byTier: tierData,
        byCurrency: currencyData,
        trends: formattedTrends,
        topPartners: topPartnersData,
        records,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export analytics data
 * @route   GET /api/analytics/export
 * @access  Private (Company SuperAdmin)
 */
export const exportAnalytics = async (req, res, next) => {
  try {
    const { type = 'registrations', period = 'month', format = 'csv' } = req.query;
    const companyId = req.user.companyId;

    let data = [];
    let filename = '';

    const { startDate, endDate } = getDateRange(period);

    switch (type) {
      case 'registrations':
        data = await User.aggregate([
          {
            $match: {
              companyId,
              role: 'partner',
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $lookup: {
              from: 'partnercompanies',
              localField: '_id',
              foreignField: 'partnerId',
              as: 'partnership'
            }
          },
          { $unwind: { path: '$partnership', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              email: 1,
              status: '$partnership.status',
              tier: '$partnership.tier',
              createdAt: 1
            }
          },
          { $sort: { createdAt: -1 } }
        ]);
        filename = 'registrations-export';
        break;

      case 'logins':
        data = await LoginLog.find({
          companyId,
          timestamp: { $gte: startDate, $lte: endDate }
        })
          .populate('userId', 'firstName lastName email role')
          .sort({ timestamp: -1 })
          .lean();
        filename = 'logins-export';
        break;

      case 'properties':
        data = await Property.find({ companyId })
          .sort({ createdAt: -1 })
          .lean();
        filename = 'properties-export';
        break;

      case 'commissions':
        data = await Commission.find({ companyId })
          .populate('partner', 'firstName lastName email')
          .populate('property', 'name')
          .sort({ createdAt: -1 })
          .lean();
        filename = 'commissions-export';
        break;

      default:
        throw new ApiError(400, 'Invalid export type');
    }

    res.json({
      success: true,
      data: {
        records: data,
        filename: `${filename}-${new Date().toISOString().split('T')[0]}`,
        type,
        period,
        totalRecords: data.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getOverview,
  getRegistrationTrends,
  getApprovalReports,
  getLoginActivity,
  getPropertyReports,
  getCommissionReports,
  exportAnalytics
};