import ChatMessage from '../models/ChatMessage.js';
import PartnerCompany from '../models/PartnerCompany.js';
import User from '../models/User.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * @desc    Get all conversations for admin (Company SuperAdmin or Partner Manager)
 * @route   GET /api/chat/conversations
 * @access  Private (company_superadmin, partner_manager)
 */
export const getConversations = async (req, res, next) => {
  try {
    const { adminType } = req.query;

    // Determine admin type from user role if not specified
    const effectiveAdminType = adminType || req.user.role;

    // Validate that user can access this admin type's conversations
    if (effectiveAdminType !== req.user.role) {
      throw new ApiError(403, 'Access denied for this conversation type');
    }

    // Get all partnerships for this company
    const partnerships = await PartnerCompany.find({
      companyId: req.user.companyId,
      status: 'active'
    }).populate('partnerId', 'firstName lastName email phone partnerProfile');

    // For each partnership, get last message and unread count
    const conversations = await Promise.all(partnerships.map(async (partnership) => {
      // Get last message
      const lastMessage = await ChatMessage.findOne({
        partnershipId: partnership._id,
        adminType: effectiveAdminType
      }).sort({ createdAt: -1 })
        .populate('sender.userId', 'firstName lastName');

      // Get unread count (messages from partner that admin hasn't read)
      const unreadCount = await ChatMessage.countDocuments({
        partnershipId: partnership._id,
        adminType: effectiveAdminType,
        'sender.type': 'partner',
        readAt: { $exists: false }
      });

      return {
        partnership: {
          _id: partnership._id,
          tier: partnership.tier,
          partner: partnership.partnerId
        },
        lastMessage,
        unreadCount
      };
    }));

    // Sort by last message date
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.status(200).json({
      success: true,
      data: {
        conversations,
        adminType: effectiveAdminType
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversations for partner
 * @route   GET /api/chat/my-conversations
 * @access  Private (partner)
 */
export const getPartnerConversations = async (req, res, next) => {
  try {
    // Get partner's partnerships
    const partnerships = await PartnerCompany.find({
      partnerId: req.user._id,
      status: 'active'
    }).populate('companyId', 'name logo');

    const conversations = await Promise.all(partnerships.map(async (partnership) => {
      const conversationsForPartnership = [];

      // Get SuperAdmin chat
      const superAdminLastMessage = await ChatMessage.findOne({
        partnershipId: partnership._id,
        adminType: 'company_superadmin'
      }).sort({ createdAt: -1 })
        .populate('sender.userId', 'firstName lastName');

      const superAdminUnread = await ChatMessage.countDocuments({
        partnershipId: partnership._id,
        adminType: 'company_superadmin',
        'sender.type': 'admin',
        readAt: { $exists: false }
      });

      conversationsForPartnership.push({
        adminType: 'company_superadmin',
        label: 'Company SuperAdmin',
        partnership: {
          _id: partnership._id,
          company: partnership.companyId
        },
        lastMessage: superAdminLastMessage,
        unreadCount: superAdminUnread
      });

      // Get Partner Manager chat
      const partnerManagerLastMessage = await ChatMessage.findOne({
        partnershipId: partnership._id,
        adminType: 'partner_manager'
      }).sort({ createdAt: -1 })
        .populate('sender.userId', 'firstName lastName');

      const partnerManagerUnread = await ChatMessage.countDocuments({
        partnershipId: partnership._id,
        adminType: 'partner_manager',
        'sender.type': 'admin',
        readAt: { $exists: false }
      });

      conversationsForPartnership.push({
        adminType: 'partner_manager',
        label: 'Partner Manager',
        partnership: {
          _id: partnership._id,
          company: partnership.companyId
        },
        lastMessage: partnerManagerLastMessage,
        unreadCount: partnerManagerUnread
      });

      return conversationsForPartnership;
    }));

    // Flatten the array
    const flatConversations = conversations.flat();

    res.status(200).json({
      success: true,
      data: {
        conversations: flatConversations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get messages for a conversation
 * @route   GET /api/chat/conversations/:partnershipId/:adminType
 * @access  Private
 */
export const getConversationMessages = async (req, res, next) => {
  try {
    const { partnershipId, adminType } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate access
    await validateConversationAccess(req.user, partnershipId, adminType);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await ChatMessage.find({
      partnershipId,
      adminType
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender.userId', 'firstName lastName email')
      .populate('readBy', 'firstName lastName');

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message (REST API fallback)
 * @route   POST /api/chat/conversations/:partnershipId/:adminType/send
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { partnershipId, adminType } = req.params;
    const { message, attachments } = req.body;

    if (!message && (!attachments || attachments.length === 0)) {
      throw new ApiError(400, 'Message or attachments required');
    }

    // Validate access and determine sender type
    const senderType = await validateConversationAccess(req.user, partnershipId, adminType);

    // Get company ID
    const partnership = await PartnerCompany.findById(partnershipId).populate('partnerId', 'firstName lastName');
    if (!partnership) {
      throw new ApiError(404, 'Partnership not found');
    }

    const chatMessage = await ChatMessage.create({
      companyId: partnership.companyId,
      partnershipId,
      adminType,
      sender: {
        type: senderType,
        userId: req.user._id
      },
      message: message || '',
      attachments: attachments || []
    });

    await chatMessage.populate('sender.userId', 'firstName lastName email');

    // Emit socket event
    const { getIO } = await import('../socket.js');
    const io = getIO();
    const roomId = `chat:${partnershipId}:${adminType}`;
    io.to(roomId).emit('new-message', { message: chatMessage });

    // Send notification to the other party (if not in the conversation room)
    if (senderType === 'partner') {
      // Notify admin
      const adminRoom = `company:${partnership.companyId}:${adminType}`;
      io.to(adminRoom).emit('chat-notification', {
        partnershipId,
        adminType,
        message: chatMessage,
        partnerName: `${partnership.partnerId.firstName} ${partnership.partnerId.lastName}`
      });
    } else {
      // Notify partner
      const partnerRoom = `user:${partnership.partnerId._id}`;
      io.to(partnerRoom).emit('chat-notification', {
        partnershipId,
        adminType,
        message: chatMessage,
        adminName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: { message: chatMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chat/conversations/:partnershipId/:adminType/read
 * @access  Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { partnershipId, adminType } = req.params;

    // Validate access
    await validateConversationAccess(req.user, partnershipId, adminType);

    // Determine which messages to mark as read
    const senderType = req.user.role === 'partner' ? 'admin' : 'partner';

    const result = await ChatMessage.updateMany(
      {
        partnershipId,
        adminType,
        'sender.type': senderType,
        readAt: { $exists: false }
      },
      {
        readAt: new Date(),
        readBy: req.user._id
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread counts for admin
 * @route   GET /api/chat/unread-count
 * @access  Private (company_superadmin, partner_manager)
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const adminType = req.user.role;

    const count = await ChatMessage.countDocuments({
      companyId: req.user.companyId,
      adminType,
      'sender.type': 'partner',
      readAt: { $exists: false }
    });

    res.status(200).json({
      success: true,
      data: { unreadCount: count, adminType }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread counts for partner
 * @route   GET /api/chat/my-unread-count
 * @access  Private (partner)
 */
export const getPartnerUnreadCount = async (req, res, next) => {
  try {
    // Get partnerships
    const partnerships = await PartnerCompany.find({
      partnerId: req.user._id,
      status: 'active'
    });

    const partnershipIds = partnerships.map(p => p._id);

    const superAdminUnread = await ChatMessage.countDocuments({
      partnershipId: { $in: partnershipIds },
      adminType: 'company_superadmin',
      'sender.type': 'admin',
      readAt: { $exists: false }
    });

    const partnerManagerUnread = await ChatMessage.countDocuments({
      partnershipId: { $in: partnershipIds },
      adminType: 'partner_manager',
      'sender.type': 'admin',
      readAt: { $exists: false }
    });

    res.status(200).json({
      success: true,
      data: {
        total: superAdminUnread + partnerManagerUnread,
        company_superadmin: superAdminUnread,
        partner_manager: partnerManagerUnread
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate user has access to conversation
 * @returns {string} senderType ('admin' or 'partner')
 */
const validateConversationAccess = async (user, partnershipId, adminType) => {
  const partnership = await PartnerCompany.findById(partnershipId);
  if (!partnership) {
    throw new ApiError(404, 'Partnership not found');
  }

  if (user.role === 'partner') {
    // Partner can only access their own conversations
    if (partnership.partnerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }
    return 'partner';
  } else if (user.role === 'company_superadmin' || user.role === 'partner_manager') {
    // Admin can only access conversations for their role
    if (adminType !== user.role) {
      throw new ApiError(403, 'Access denied for this conversation type');
    }
    if (partnership.companyId.toString() !== user.companyId?.toString()) {
      throw new ApiError(403, 'Access denied');
    }
    return 'admin';
  } else {
    throw new ApiError(403, 'Access denied');
  }
};