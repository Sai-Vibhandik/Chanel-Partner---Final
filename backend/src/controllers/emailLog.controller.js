import EmailLog from '../models/EmailLog.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get email logs with pagination and filters
 * @route   GET /api/email-logs
 * @access  Private (Platform Admin, Company SuperAdmin)
 */
export const getEmailLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Platform admin can see all, company admins can only see their company's logs
    if (req.user.role === 'platform_admin') {
      // Can see all logs
    } else if (req.user.companyId) {
      query.companyId = req.user.companyId;
    } else {
      throw new ApiError(403, 'Access denied');
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      }
    }

    // Search by email
    if (search) {
      query['recipient.email'] = { $regex: search, $options: 'i' };
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .populate('recipient.userId', 'firstName lastName email')
        .populate('companyId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      EmailLog.countDocuments(query)
    ]);

    // Get stats
    const stats = await EmailLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = {
      sent: 0,
      failed: 0,
      pending: 0,
      bounced: 0
    };
    stats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single email log details
 * @route   GET /api/email-logs/:id
 * @access  Private (Platform Admin, Company SuperAdmin)
 */
export const getEmailLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const emailLog = await EmailLog.findById(id)
      .populate('recipient.userId', 'firstName lastName email')
      .populate('companyId', 'name');

    if (!emailLog) {
      throw new ApiError(404, 'Email log not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin') {
      if (!req.user.companyId || emailLog.companyId?._id?.toString() !== req.user.companyId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    res.status(200).json({
      success: true,
      data: emailLog
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get email statistics
 * @route   GET /api/email-logs/stats
 * @access  Private (Platform Admin, Company SuperAdmin)
 */
export const getEmailStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build match query
    const match = {};

    // Platform admin can see all, company admins can only see their company's logs
    if (req.user.role === 'platform_admin') {
      // Can see all logs
    } else if (req.user.companyId) {
      match.companyId = req.user.companyId._id || req.user.companyId;
    } else {
      throw new ApiError(403, 'Access denied');
    }

    // Filter by date range
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      }
    }

    // Get stats by status
    const statusStats = await EmailLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get stats by type
    const typeStats = await EmailLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    match.createdAt = { $gte: thirtyDaysAgo };

    const dailyStats = await EmailLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format daily stats
    const dailyData = {};
    dailyStats.forEach(s => {
      if (!dailyData[s._id.date]) {
        dailyData[s._id.date] = { sent: 0, failed: 0, pending: 0, bounced: 0 };
      }
      dailyData[s._id.date][s._id.status] = s.count;
    });

    // Format response
    const statusCounts = {
      sent: 0,
      failed: 0,
      pending: 0,
      bounced: 0
    };
    statusStats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    const typeCounts = {};
    typeStats.forEach(t => {
      typeCounts[t._id] = t.count;
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusCounts,
        byType: typeCounts,
        daily: dailyData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend failed email
 * @route   POST /api/email-logs/:id/resend
 * @access  Private (Platform Admin, Company SuperAdmin)
 */
export const resendEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const emailLog = await EmailLog.findById(id)
      .populate('recipient.userId')
      .populate('companyId');

    if (!emailLog) {
      throw new ApiError(404, 'Email log not found');
    }

    // Check access
    if (req.user.role !== 'platform_admin') {
      if (!req.user.companyId || emailLog.companyId?._id?.toString() !== req.user.companyId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // Import email service
    const { sendEmail } = await import('../services/email.service.js');

    // Resend the email
    const result = await sendEmail({
      to: emailLog.recipient.email,
      subject: emailLog.subject,
      type: emailLog.type,
      data: emailLog.content?.data || {},
      companyId: emailLog.companyId?._id,
      userId: emailLog.recipient.userId?._id
    });

    // Update log status
    if (result.success) {
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.providerId = result.messageId;
      emailLog.errorMessage = undefined;
    } else {
      emailLog.status = 'failed';
      emailLog.errorMessage = result.error;
    }
    await emailLog.save();

    res.status(200).json({
      success: result.success,
      message: result.success ? 'Email sent successfully' : 'Failed to send email',
      data: emailLog
    });
  } catch (error) {
    next(error);
  }
};