import express from 'express';
import {
  getMyVisits,
  bookVisit,
  getVisit,
  updateVisit,
  cancelVisit,
  getCompanyVisits,
  getCalendarData,
  approveVisit,
  rejectVisit,
  completeVisit,
  markDealClosed,
  partnerMarkDealClosed,
  getVisitStats
} from '../controllers/visit.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== PARTNER ROUTES ====================
router.get('/my', restrictTo('partner'), getMyVisits);
router.post('/', restrictTo('partner'), bookVisit);

// ==================== COMPANY ADMIN ROUTES ====================
// Note: Specific routes must come BEFORE /:id parameterized route
router.get('/company', restrictTo('company_superadmin', 'partner_manager'), getCompanyVisits);
router.get('/calendar', restrictTo('company_superadmin', 'partner_manager'), getCalendarData);
router.get('/stats', restrictTo('company_superadmin', 'partner_manager', 'viewer'), getVisitStats);

// ==================== PARAMETERIZED ROUTES (must come after specific routes) ====================
router.get('/:id', getVisit);
router.put('/:id', restrictTo('partner'), updateVisit);
router.put('/:id/cancel', restrictTo('partner'), cancelVisit);
router.put('/:id/deal-closed/partner', restrictTo('partner'), partnerMarkDealClosed);
router.put('/:id/approve', restrictTo('company_superadmin', 'partner_manager'), approveVisit);
router.put('/:id/reject', restrictTo('company_superadmin', 'partner_manager'), rejectVisit);
router.put('/:id/complete', restrictTo('company_superadmin', 'partner_manager'), completeVisit);
router.put('/:id/deal-closed', restrictTo('company_superadmin', 'partner_manager'), markDealClosed);

export default router;