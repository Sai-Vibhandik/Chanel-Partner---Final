import express from 'express';
import {
  getEmailLogs,
  getEmailLog,
  getEmailStats,
  resendEmail
} from '../controllers/emailLog.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get email logs list
router.get(
  '/',
  restrictTo('platform_admin', 'company_superadmin'),
  getEmailLogs
);

// Get email statistics
router.get(
  '/stats',
  restrictTo('platform_admin', 'company_superadmin'),
  getEmailStats
);

// Get single email log
router.get(
  '/:id',
  restrictTo('platform_admin', 'company_superadmin'),
  getEmailLog
);

// Resend failed email
router.post(
  '/:id/resend',
  restrictTo('platform_admin', 'company_superadmin'),
  resendEmail
);

export default router;