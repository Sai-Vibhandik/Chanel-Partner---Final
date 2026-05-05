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

// Get all agreement templates (company_superadmin, partner_manager, platform_admin)
router.get(
  '/',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getAgreementTemplates
);

// Get partners with their signed agreements (grouped by partner)
router.get(
  '/signatures/partners',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPartnersWithSignatures
);

// Get agreement details for a specific partnership
router.get(
  '/signatures/partnership/:partnershipId',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPartnershipAgreementDetails
);

// Get all signed agreements (admin view)
router.get(
  '/signatures/all',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getSignedAgreements
);

// Get single agreement template
router.get(
  '/:id',
  protect,
  getAgreementTemplate
);

// Create agreement template (company_superadmin, partner_manager, platform_admin)
router.post(
  '/',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  createAgreementTemplate
);

// Update agreement template (company_superadmin, partner_manager, platform_admin)
router.put(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  updateAgreementTemplate
);

// Create new version of agreement (company_superadmin, partner_manager, platform_admin)
router.post(
  '/:id/new-version',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  createNewVersion
);

// Delete agreement template (company_superadmin, partner_manager, platform_admin)
router.delete(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  deleteAgreementTemplate
);

// Get partners who haven't signed latest version
router.get(
  '/:id/pending-signatures',
  protect,
  restrictTo('company_superadmin', 'partner_manager', 'platform_admin'),
  getPendingSignatures
);

export default router;