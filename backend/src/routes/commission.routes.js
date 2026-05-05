import express from 'express';
import {
  createCommission,
  getCompanyCommissions,
  getPartnerCommissions,
  getCommissionById,
  approveCommission,
  markAsPaid,
  cancelCommission,
  getCommissionStats
} from '../controllers/commission.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== FINANCE MANAGER ROUTES ====================

// Create commission (finance_manager, company_superadmin, partner_manager)
router.post(
  '/',
  restrictTo('finance_manager', 'company_superadmin', 'partner_manager'),
  createCommission
);

// Get company commissions (finance_manager, company_superadmin, partner_manager)
router.get(
  '/',
  restrictTo('finance_manager', 'company_superadmin', 'partner_manager'),
  getCompanyCommissions
);

// Get commission stats (finance_manager, company_superadmin, partner_manager, viewer)
router.get(
  '/stats',
  restrictTo('finance_manager', 'company_superadmin', 'partner_manager', 'viewer'),
  getCommissionStats
);

// ==================== PARTNER ROUTES ====================

// Get partner's own commissions
router.get(
  '/my',
  restrictTo('partner'),
  getPartnerCommissions
);

// ==================== PARAMETERIZED ROUTES ====================

// Get single commission details
router.get('/:id', getCommissionById);

// Approve commission (finance_manager, company_superadmin)
router.put(
  '/:id/approve',
  restrictTo('finance_manager', 'company_superadmin'),
  approveCommission
);

// Mark as paid (finance_manager, company_superadmin)
router.put(
  '/:id/pay',
  restrictTo('finance_manager', 'company_superadmin'),
  markAsPaid
);

// Cancel commission (finance_manager, company_superadmin)
router.put(
  '/:id/cancel',
  restrictTo('finance_manager', 'company_superadmin'),
  cancelCommission
);

export default router;