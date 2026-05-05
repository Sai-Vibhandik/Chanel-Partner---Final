import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import {
  getOverview,
  getRegistrationTrends,
  getApprovalReports,
  getLoginActivity,
  getPropertyReports,
  getCommissionReports,
  exportAnalytics
} from '../controllers/analytics.controller.js';

const router = express.Router();

// All routes require authentication and company admin role
router.use(protect);
router.use(restrictTo('company_superadmin', 'platform_admin'));

// Analytics endpoints
router.get('/overview', getOverview);
router.get('/registrations', getRegistrationTrends);
router.get('/approvals', getApprovalReports);
router.get('/logins', getLoginActivity);
router.get('/properties', getPropertyReports);
router.get('/commissions', getCommissionReports);
router.get('/export', exportAnalytics);

export default router;