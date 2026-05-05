import express from 'express';
import {
  applyToCompany,
  getMyCompanies,
  getCompanyPartners,
  getPartnership,
  updatePartnershipStatus,
  updatePartnershipTier,
  uploadKYCForPartnership,
  getKYCForPartnership,
  verifyKYCForPartnership,
  getKYCReviews,
  leaveCompany
} from '../controllers/partnerCompany.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ========== PARTNER ROUTES ==========

// Partner applies to join a company
router.post('/apply', restrictTo('partner'), applyToCompany);

// Partner views their companies
router.get('/my-companies', restrictTo('partner'), getMyCompanies);

// Partner uploads KYC for a partnership
router.post('/:id/kyc', restrictTo('partner'), uploadKYCForPartnership);

// Partner leaves a company
router.delete('/:id/leave', restrictTo('partner'), leaveCompany);

// ========== COMPANY STAFF ROUTES ==========

// Get partners for a specific company
router.get(
  '/company/:companyId/partners',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager', 'finance_manager', 'property_manager'),
  getCompanyPartners
);

// Get all KYC reviews for company (admin dashboard)
router.get(
  '/kyc-reviews',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  getKYCReviews
);

// ========== PARTNERSHIP MANAGEMENT ==========

// Get partnership details
router.get('/:id', getPartnership);

// Update partnership status (approve/reject)
router.put(
  '/:id/status',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  updatePartnershipStatus
);

// Update partnership tier
router.put(
  '/:id/tier',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  updatePartnershipTier
);

// Get KYC summary for partnership
router.get('/:id/kyc', getKYCForPartnership);

// Verify KYC document
router.put(
  '/:id/kyc/:documentId/verify',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  verifyKYCForPartnership
);

export default router;