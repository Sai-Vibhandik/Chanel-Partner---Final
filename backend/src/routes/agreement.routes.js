import express from 'express';
import {
  // Admin routes
  getAgreementTemplates,
  getAgreementTemplate,
  createAgreementTemplate,
  updateAgreementTemplate,
  createNewVersion,
  deleteAgreementTemplate,
  getSignedAgreements,
  getPendingSignatures,
  getPartnersWithSignatures,
  getPartnershipAgreementDetails,
  getAgreementTemplateHistory,

  // Partner routes
  getPartnerAgreements,
  signAgreement,
  getSignedAgreementsForPartner
} from '../controllers/agreement.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ==================== PARTNER ROUTES (MUST BE BEFORE /:id) ====================

// Get agreements to sign (partner)
router.get(
  '/partner/agreements',
  protect,
  restrictTo('partner'),
  getPartnerAgreements
);

// Sign an agreement (partner)
router.post(
  '/partner/agreements/:id/sign',
  protect,
  restrictTo('partner'),
  signAgreement
);

// Get partner's signed agreements
router.get(
  '/partner/agreements/signed',
  protect,
  restrictTo('partner'),
  getSignedAgreementsForPartner
);

// ==================== ADMIN ROUTES ====================

// Get all agreement templates (READ-ONLY for partner_manager)
router.get(
  '/',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getAgreementTemplates
);

// Get agreement template history (archived versions)
router.get(
  '/history',
  protect,
  restrictTo('company_superadmin', 'platform_admin'),
  getAgreementTemplateHistory
);

// Get partners with their signed agreements (grouped by partner) - READ ONLY
router.get(
  '/signatures/partners',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPartnersWithSignatures
);

// Get agreement details for a specific partnership - READ ONLY
router.get(
  '/signatures/partnership/:partnershipId',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPartnershipAgreementDetails
);

// Get all signed agreements (admin view) - READ ONLY
router.get(
  '/signatures/all',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getSignedAgreements
);

// Get single agreement template - READ ONLY
router.get(
  '/:id',
  protect,
  getAgreementTemplate
);

// ==================== WRITE OPERATIONS (company_superadmin and platform_admin ONLY) ====================
// Partner Manager does NOT have access to these routes

// Create agreement template (company_superadmin, platform_admin ONLY)
router.post(
  '/',
  protect,
  restrictTo('company_superadmin', 'platform_admin'),
  createAgreementTemplate
);

// Update agreement template (company_superadmin, platform_admin ONLY)
router.put(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'platform_admin'),
  updateAgreementTemplate
);

// Create new version of agreement (company_superadmin, platform_admin ONLY)
router.post(
  '/:id/new-version',
  protect,
  restrictTo('company_superadmin', 'platform_admin'),
  createNewVersion
);

// Delete agreement template (company_superadmin, platform_admin ONLY)
router.delete(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'platform_admin'),
  deleteAgreementTemplate
);

// Get partners who haven't signed latest version - READ ONLY
router.get(
  '/:id/pending-signatures',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPendingSignatures
);

export default router;