import express from 'express';
import {
  getCompanies,
  getCompany,
  updateCompanyStatus,
  updateCompany,
  updateCompanySettings,
  getCompanySettings,
  getMyCompanySettings,
  deleteCompany,
  getCompanyStats,
  getActiveCompaniesForRegistration
} from '../controllers/company.controller.js';
import { protect, restrictTo, platformAdminOnly, checkCompanyAccess } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/public/list', getActiveCompaniesForRegistration);

// All routes below require authentication
router.use(protect);

// My company settings (must come before /:id routes)
router.get('/my-settings', getMyCompanySettings);

// Platform Admin only routes
router.get('/stats', platformAdminOnly, getCompanyStats);
router.get('/', platformAdminOnly, getCompanies);
router.put('/:id/status', platformAdminOnly, updateCompanyStatus);
router.delete('/:id', platformAdminOnly, deleteCompany);

// Company access routes (Platform Admin or Company users)
router.get('/:id', checkCompanyAccess, getCompany);
router.put('/:id', checkCompanyAccess, updateCompany);

// Settings routes
router.get('/:id/settings', checkCompanyAccess, getCompanySettings);
router.put('/:id/settings', checkCompanyAccess, updateCompanySettings);

export default router;