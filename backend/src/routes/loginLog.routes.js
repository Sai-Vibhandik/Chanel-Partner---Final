import express from 'express';
import {
  getLogs,
  getStats,
  getUserHistory,
  getMyHistory,
  getRecentActivity
} from '../controllers/loginLog.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get my own login history - all authenticated users
router.get('/me', getMyHistory);

// Get recent activity - company_superadmin only
router.get('/recent', restrictTo('company_superadmin'), getRecentActivity);

// Get statistics - company_superadmin only
router.get('/stats', restrictTo('company_superadmin'), getStats);

// Get all logs with filters - company_superadmin only
router.get('/', restrictTo('company_superadmin'), getLogs);

// Get specific user's history - company_superadmin only
router.get('/user/:userId', restrictTo('company_superadmin'), getUserHistory);

export default router;