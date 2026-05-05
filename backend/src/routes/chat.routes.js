import express from 'express';
import {
  getConversations,
  getPartnerConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  getPartnerUnreadCount
} from '../controllers/chat.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== ADMIN ROUTES ====================

// Get all conversations for admin
router.get(
  '/conversations',
  restrictTo('company_superadmin', 'partner_manager'),
  getConversations
);

// Get unread count for admin
router.get(
  '/unread-count',
  restrictTo('company_superadmin', 'partner_manager'),
  getUnreadCount
);

// ==================== PARTNER ROUTES ====================

// Get partner's conversations
router.get(
  '/my-conversations',
  restrictTo('partner'),
  getPartnerConversations
);

// Get partner's unread count
router.get(
  '/my-unread-count',
  restrictTo('partner'),
  getPartnerUnreadCount
);

// ==================== SHARED ROUTES ====================

// Get messages for a conversation
router.get(
  '/conversations/:partnershipId/:adminType',
  getConversationMessages
);

// Send a message
router.post(
  '/conversations/:partnershipId/:adminType/send',
  sendMessage
);

// Mark messages as read
router.put(
  '/conversations/:partnershipId/:adminType/read',
  markAsRead
);

export default router;