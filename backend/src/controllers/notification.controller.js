import Notification from '../models/Notification.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const query = { recipientId: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('data.agreementId', 'name type')
      .populate('data.partnershipId', 'tier status')
      .populate('data.companyId', 'name');

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    // Check ownership
    if (notification.recipientId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create notification (internal use)
 */
export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  data = {},
  link = ''
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      data,
      link
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * @desc    Create notifications for multiple recipients
 */
export const createNotificationsForRecipients = async ({
  recipientIds,
  type,
  title,
  message,
  data = {},
  link = ''
}) => {
  try {
    const notifications = recipientIds.map(recipientId => ({
      recipientId,
      type,
      title,
      message,
      data,
      link,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return [];
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  createNotificationsForRecipients
};