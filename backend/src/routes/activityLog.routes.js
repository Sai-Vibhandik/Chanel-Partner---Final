import express from 'express';
import {
  getActivityLogsList,
  getResourceLogs,
  getMyActivityLogs,
  getActivityTypes
} from '../controllers/activityLog.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get action types and resource types for filters
router.get('/types', getActivityTypes);

// Get current user's activity logs
router.get('/my-activity', getMyActivityLogs);

// Get activity logs for a specific resource
router.get('/resource/:resourceId', getResourceLogs);

// Get activity logs for the company (with filters) - company_superadmin only
router.get('/', restrictTo('company_superadmin'), getActivityLogsList);

export default router;