import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './models/User.js';
import ChatMessage from './models/ChatMessage.js';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @param {Object} corsOrigin - CORS origin configuration
 */
export const initializeSocket = (httpServer, corsOrigin = 'http://localhost:5173') => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Try to get token from auth object first
      let token = socket.handshake.auth?.token;

      // If no token in auth, try authorization header
      if (!token && socket.handshake.headers.authorization) {
        token = socket.handshake.headers.authorization.replace('Bearer ', '');
      }

      // If still no token, try to get from cookies
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie;
        // Try accessToken first (primary)
        const accessTokenMatch = cookies.match(/accessToken=([^;]+)/);
        if (accessTokenMatch) {
          token = accessTokenMatch[1];
        }
        // Fallback to token cookie
        if (!token) {
          const tokenMatch = cookies.match(/token=([^;]+)/);
          if (tokenMatch) {
            token = tokenMatch[1];
          }
        }
      }

      if (!token) {
        console.error('Socket auth error: No token found');
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.firstName} (${socket.user.role})`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.user._id}`);

    // Join company room for admin users (for general company broadcasts)
    const isAdmin = ['company_superadmin', 'partner_manager'].includes(socket.user.role);
    console.log(`User ${socket.user.firstName} role: ${socket.user.role}, companyId: ${socket.user.companyId}, isAdmin: ${isAdmin}`);

    if (socket.user.companyId && isAdmin) {
      const companyRoom = `company:${socket.user.companyId}`;
      const roleRoom = `company:${socket.user.companyId}:${socket.user.role}`;
      socket.join(companyRoom);
      socket.join(roleRoom);
      console.log(`Admin ${socket.user.firstName} joined rooms: ${companyRoom}, ${roleRoom}`);
    }

    // Handle joining a conversation room
    socket.on('join-conversation', async (data) => {
      try {
        const { partnershipId, adminType } = data;

        // Validate access
        const roomId = getConversationRoomId(partnershipId, adminType);
        socket.join(roomId);
        console.log(`User ${socket.user.firstName} joined room: ${roomId}`);

        // Send acknowledgment
        socket.emit('joined-conversation', { partnershipId, adminType });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle leaving a conversation room
    socket.on('leave-conversation', (data) => {
      const { partnershipId, adminType } = data;
      const roomId = getConversationRoomId(partnershipId, adminType);
      socket.leave(roomId);
      console.log(`User ${socket.user.firstName} left room: ${roomId}`);
    });

    // Handle sending a message
    socket.on('send-message', async (data) => {
      try {
        const { partnershipId, adminType, message, attachments } = data;

        // Validate sender type based on user role
        let senderType;
        if (socket.user.role === 'partner') {
          senderType = 'partner';
        } else if (
          (adminType === 'company_superadmin' && socket.user.role === 'company_superadmin') ||
          (adminType === 'partner_manager' && socket.user.role === 'partner_manager')
        ) {
          senderType = 'admin';
        } else {
          throw new Error('Unauthorized to send message in this conversation');
        }

        // Create and save message
        const chatMessage = await ChatMessage.create({
          companyId: socket.user.companyId || (await getCompanyIdFromPartnership(partnershipId)),
          partnershipId,
          adminType,
          sender: {
            type: senderType,
            userId: socket.user._id
          },
          message,
          attachments: attachments || []
        });

        // Populate sender info
        await chatMessage.populate('sender.userId', 'firstName lastName email');

        const roomId = getConversationRoomId(partnershipId, adminType);

        // Broadcast message to conversation room
        io.to(roomId).emit('new-message', {
          message: chatMessage
        });

        // Send notification to the other party
        await sendNotificationToOtherParty(partnershipId, adminType, senderType, chatMessage);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicator
    socket.on('typing-start', (data) => {
      const { partnershipId, adminType } = data;
      const roomId = getConversationRoomId(partnershipId, adminType);
      socket.to(roomId).emit('user-typing', {
        userId: socket.user._id,
        userName: socket.user.firstName,
        partnershipId,
        adminType
      });
    });

    socket.on('typing-stop', (data) => {
      const { partnershipId, adminType } = data;
      const roomId = getConversationRoomId(partnershipId, adminType);
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.user._id,
        partnershipId,
        adminType
      });
    });

    // Handle marking messages as read
    socket.on('mark-read', async (data) => {
      try {
        const { partnershipId, adminType } = data;

        // Convert partnershipId to ObjectId
        const partnershipObjectId = new mongoose.Types.ObjectId(partnershipId);

        // Determine which messages to mark as read
        const senderType = socket.user.role === 'partner' ? 'admin' : 'partner';

        // Get the count before updating (for notification)
        const countBefore = await ChatMessage.countDocuments({
          partnershipId: partnershipObjectId,
          adminType,
          'sender.type': senderType,
          readAt: { $exists: false }
        });

        console.log(`Marking ${countBefore} messages as read for partnership ${partnershipId}, adminType ${adminType}`);

        const result = await ChatMessage.updateMany(
          {
            partnershipId: partnershipObjectId,
            adminType,
            'sender.type': senderType,
            readAt: { $exists: false }
          },
          {
            readAt: new Date(),
            readBy: socket.user._id
          }
        );

        console.log(`Marked ${result.modifiedCount} messages as read`);

        const roomId = getConversationRoomId(partnershipId, adminType);

        // Broadcast to others in the room that messages were read
        socket.to(roomId).emit('messages-read', {
          partnershipId,
          adminType,
          readBy: socket.user._id,
          readAt: new Date(),
          countMarked: countBefore
        });

        // Emit back to the sender so they can refresh their UI
        socket.emit('messages-read-confirmed', {
          partnershipId,
          adminType,
          modifiedCount: result.modifiedCount,
          countMarked: countBefore
        });

        // Emit conversation update to refresh conversation list
        socket.emit('conversation-updated', {
          partnershipId,
          adminType,
          unreadCount: 0
        });

        // Emit unread count update to refresh the sidebar
        socket.emit('unread-count-updated', {
          unreadCount: 'refresh'
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.firstName} (${socket.user.role})`);
    });
  });

  return io;
};

/**
 * Get conversation room ID
 */
const getConversationRoomId = (partnershipId, adminType) => {
  return `chat:${partnershipId}:${adminType}`;
};

/**
 * Get company ID from partnership
 */
const getCompanyIdFromPartnership = async (partnershipId) => {
  const PartnerCompany = (await import('./models/PartnerCompany.js')).default;
  const partnership = await PartnerCompany.findById(partnershipId);
  return partnership?.companyId;
};

/**
 * Send notification to the other party in the conversation
 */
const sendNotificationToOtherParty = async (partnershipId, adminType, senderType, message) => {
  try {
    const PartnerCompany = (await import('./models/PartnerCompany.js')).default;
    const partnership = await PartnerCompany.findById(partnershipId).populate('partnerId');

    if (senderType === 'partner') {
      // Notify admin (company_superadmin or partner_manager based on adminType)
      const adminRoom = `company:${partnership.companyId}:${adminType}`;
      console.log(`Sending chat-notification to room: ${adminRoom}`);
      io.to(adminRoom).emit('chat-notification', {
        partnershipId,
        adminType,
        message,
        partnerName: `${partnership.partnerId.firstName} ${partnership.partnerId.lastName}`
      });
    } else {
      // Notify partner
      const partnerRoom = `user:${partnership.partnerId._id}`;
      console.log(`Sending chat-notification to room: ${partnerRoom}`);
      io.to(partnerRoom).emit('chat-notification', {
        partnershipId,
        adminType,
        message,
        adminName: `${message.sender.userId.firstName} ${message.sender.userId.lastName}`
      });
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit event to specific user
 */
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit event to company admins
 */
export const emitToCompany = (companyId, event, data) => {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
};

export default { initializeSocket, getIO, emitToUser, emitToCompany };