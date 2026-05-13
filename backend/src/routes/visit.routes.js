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
import {
  validateBookVisit,
  validateUpdateVisit,
  validateCancelVisit,
  validateCompleteVisit,
  validateVisitAction,
  validateListVisits,
  validateGetVisit,
  validateCalendarQuery
} from '../validations/visit.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== PARTNER ROUTES ====================
router.get('/my', restrictTo('partner'), validateListVisits, getMyVisits);
router.post('/', restrictTo('partner'), validateBookVisit, bookVisit);

// ==================== COMPANY ADMIN ROUTES ====================
// Note: Specific routes must come BEFORE /:id parameterized route
router.get('/company', restrictTo('company_superadmin', 'partner_manager'), validateListVisits, getCompanyVisits);
router.get('/calendar', restrictTo('company_superadmin', 'partner_manager'), validateCalendarQuery, getCalendarData);
router.get('/stats', restrictTo('company_superadmin', 'partner_manager', 'viewer'), getVisitStats);

// ==================== PARAMETERIZED ROUTES (must come after specific routes) ====================
router.get('/:id', validateGetVisit, getVisit);
router.put('/:id', restrictTo('partner'), validateUpdateVisit, updateVisit);
router.put('/:id/cancel', restrictTo('partner'), validateCancelVisit, cancelVisit);
router.put('/:id/deal-closed/partner', restrictTo('partner'), validateVisitAction, partnerMarkDealClosed);
router.put('/:id/approve', restrictTo('company_superadmin', 'partner_manager'), validateVisitAction, approveVisit);
router.put('/:id/reject', restrictTo('company_superadmin', 'partner_manager'), validateVisitAction, rejectVisit);
router.put('/:id/complete', restrictTo('company_superadmin', 'partner_manager'), validateCompleteVisit, completeVisit);
router.put('/:id/deal-closed', restrictTo('company_superadmin', 'partner_manager'), validateVisitAction, markDealClosed);

export default router;