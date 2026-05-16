import express from 'express';
import {
  getPartners,
  getPartner,
  updatePartnerStatus,
  updatePartnerTier,
  updatePartnerProfile,
  getPartnerStats,
  deletePartner,
  uploadKYCDocument,
  deleteKYCDocument,
  verifyKYCDocument,
  getKYCSummary,
  getRecentActivities
} from '../controllers/partner.controller.js';
import { protect, restrictTo, hasPermission } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get partner statistics - accessible by company roles
router.get(
  '/stats',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager', 'viewer'),
  getPartnerStats
);

// Get recent activities - accessible by partner manager and company superadmin
router.get(
  '/recent-activities',
  restrictTo('company_superadmin', 'partner_manager'),
  getRecentActivities
);

// Get all partners - accessible by company roles
router.get(
  '/',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager', 'finance_manager'),
  getPartners
);

// Get single partner
router.get('/:id', getPartner);

// Get KYC summary for partner
router.get('/:id/kyc', getKYCSummary);

// Update partner status - Partner Manager or Company SuperAdmin
router.put(
  '/:id/status',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  updatePartnerStatus
);

// Update partner tier - Partner Manager or Company SuperAdmin
router.put(
  '/:id/tier',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  updatePartnerTier
);

// Update partner profile - Partner (own profile) or Company Admin
router.put('/:id/profile', updatePartnerProfile);

// Upload KYC document - Partner only (own profile)
router.post('/:id/kyc', uploadKYCDocument);

// Delete KYC document - Partner only (own profile)
router.delete('/:id/kyc/:documentId', deleteKYCDocument);

// Verify/Reject KYC document - Partner Manager or Company SuperAdmin
router.put(
  '/:id/kyc/:documentId/verify',
  restrictTo('platform_admin', 'company_superadmin', 'partner_manager'),
  verifyKYCDocument
);

// Delete partner - Company SuperAdmin or Platform Admin
router.delete(
  '/:id',
  restrictTo('platform_admin', 'company_superadmin'),
  deletePartner
);

export default router;