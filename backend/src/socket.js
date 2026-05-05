import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
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
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ');

      if (!token) {
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

    // Join company room for admin users
    if (socket.user.companyId && ['company_superadmin', 'partner_manager'].includes(socket.user.role)) {
      socket.join(`company:${socket.user.companyId}`);
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

        // Determine which messages to mark as read
        const senderType = socket.user.role === 'partner' ? 'admin' : 'partner';

        const result = await ChatMessage.updateMany(
          {
            partnershipId,
            adminType,
            'sender.type': senderType,
            readAt: { $exists: false }
          },
          {
            readAt: new Date(),
            readBy: socket.user._id
          }
        );

        const roomId = getConversationRoomId(partnershipId, adminType);
        socket.to(roomId).emit('messages-read', {
          partnershipId,
          adminType,
          readBy: socket.user._id,
          readAt: new Date()
        });

      } catch (error) {
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
      io.to(adminRoom).emit('chat-notification', {
        partnershipId,
        adminType,
        message,
        partnerName: `${partnership.partnerId.firstName} ${partnership.partnerId.lastName}`
      });
    } else {
      // Notify partner
      const partnerRoom = `user:${partnership.partnerId._id}`;
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