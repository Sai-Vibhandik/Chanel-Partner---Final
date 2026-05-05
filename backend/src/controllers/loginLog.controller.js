import LoginLog from '../models/LoginLog.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * Get all login logs with pagination and filters
 * @route   GET /api/login-logs
 * @access  Private (company_superadmin)
 */
export const getLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      email,
      startDate,
      endDate,
      country,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};

    // Filter by company (for company_superadmin)
    if (req.user.role === 'company_superadmin' && req.user.companyId) {
      filter.companyId = req.user.companyId;
    }

    // Status filter
    if (status && ['success', 'failed'].includes(status)) {
      filter.status = status;
    }

    // User filter
    if (userId) {
      filter.userId = userId;
    }

    // Email filter (partial match)
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    // Country filter
    if (country) {
      filter['location.country'] = { $regex: country, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [logs, total] = await Promise.all([
      LoginLog.find(filter)
        .populate('userId', 'firstName lastName email role')
        .populate('companyId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoginLog.countDocuments(filter)
    ]);

    // Get unique countries for filter dropdown
    const countries = await LoginLog.distinct('location.country', {
      ...filter,
      'location.country': { $ne: null }
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          countries: countries.filter(c => c)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get login statistics
 * @route   GET /api/login-logs/stats
 * @access  Private (company_superadmin)
 */
export const getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (req.user.role === 'company_superadmin' && req.user.companyId) {
      dateFilter.companyId = req.user.companyId;
    }

    // Default to last 30 days if no date range provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    dateFilter.timestamp = { $gte: start, $lte: end };

    // Get stats
    const [
      totalLogins,
      successfulLogins,
      failedLogins,
      uniqueUsers,
      uniqueIPs,
      topBrowsers,
      topOS,
      topCountries,
      dailyStats
    ] = await Promise.all([
      // Total login attempts
      LoginLog.countDocuments(dateFilter),

      // Successful logins
      LoginLog.countDocuments({ ...dateFilter, status: 'success' }),

      // Failed logins
      LoginLog.countDocuments({ ...dateFilter, status: 'failed' }),

      // Unique users who logged in
      LoginLog.distinct('userId', { ...dateFilter, userId: { $ne: null } }),

      // Unique IPs
      LoginLog.distinct('ip', dateFilter),

      // Top browsers
      LoginLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$browser.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { browser: '$_id', count: 1, _id: 0 } }
      ]),

      // Top operating systems
      LoginLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$os.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { os: '$_id', count: 1, _id: 0 } }
      ]),

      // Top countries
      LoginLog.aggregate([
        { $match: { ...dateFilter, 'location.country': { $ne: null } } },
        { $group: { _id: '$location.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { country: '$_id', count: 1, _id: 0 } }
      ]),

      // Daily stats
      LoginLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            successes: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'success'] }, '$count', 0] }
            },
            failures: {
              $sum: { $cond: [{ $eq: ['$_id.status', 'failed'] }, '$count', 0] }
            }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', successes: 1, failures: 1, _id: 0 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalLogins,
          successful: successfulLogins,
          failed: failedLogins,
          uniqueUsers: uniqueUsers.length,
          uniqueIPs: uniqueIPs.length
        },
        browsers: topBrowsers,
        operatingSystems: topOS,
        countries: topCountries,
        dailyStats,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get login history for a specific user
 * @route   GET /api/login-logs/user/:userId
 * @access  Private (company_superadmin)
 */
export const getUserHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify user exists and belongs to same company
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check company access
    if (req.user.role === 'company_superadmin') {
      if (!user.companyId || user.companyId.toString() !== req.user.companyId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      LoginLog.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoginLog.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's own login history
 * @route   GET /api/login-logs/me
 * @access  Private
 */
export const getMyHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      LoginLog.find({ userId: req.user._id, status: 'success' })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoginLog.countDocuments({ userId: req.user._id, status: 'success' })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent login activity for dashboard
 * @route   GET /api/login-logs/recent
 * @access  Private (company_superadmin)
 */
export const getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const filter = {};
    if (req.user.role === 'company_superadmin' && req.user.companyId) {
      filter.companyId = req.user.companyId;
    }

    const logs = await LoginLog.find(filter)
      .populate('userId', 'firstName lastName email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getLogs,
  getStats,
  getUserHistory,
  getMyHistory,
  getRecentActivity
};