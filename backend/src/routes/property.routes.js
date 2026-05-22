import express from 'express';
import {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
  uploadPropertyImages,
  deletePropertyImage,
  uploadPropertyBrochure,
  getPropertyStats,
  getPublicProperties,
  getPropertiesForPartnership,
  getPropertyPerformanceReport,
  getVisitAnalytics,
  exportPropertyReport
} from '../controllers/property.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { requireActiveSubscription, checkPropertyLimit } from '../middlewares/planLimits.middleware.js';
import {
  validateCreateProperty,
  validateUpdateProperty,
  validateGetProperty,
  validateListProperties,
  validateUpdatePropertyStatus
} from '../validations/property.validation.js';

const router = express.Router();

// Public route - get active properties
router.get('/public', getPublicProperties);

// All routes below require authentication
router.use(protect);

// Get properties for a specific partnership (Partner only)
router.get('/partnership/:partnershipId', getPropertiesForPartnership);

// Property reports (Property Manager, Company SuperAdmin)
router.get('/reports/performance', restrictTo('company_superadmin', 'property_manager'), getPropertyPerformanceReport);
router.get('/reports/visit-analytics', restrictTo('company_superadmin', 'property_manager'), getVisitAnalytics);
router.get('/reports/export', restrictTo('company_superadmin', 'property_manager'), exportPropertyReport);

// Get property statistics (company staff and viewer)
router.get('/stats', restrictTo('company_superadmin', 'partner_manager', 'property_manager', 'finance_manager', 'viewer'), getPropertyStats);

// Property CRUD (company staff)
// Note: Access control is handled within each controller

// Create property - check subscription and property limit
router.post('/', requireActiveSubscription, checkPropertyLimit, validateCreateProperty, createProperty);

// Read operations - allowed even for expired subscriptions (company can view their own data)
router.get('/', validateListProperties, getProperties);
router.get('/:id', validateGetProperty, getProperty);

// Write operations - require active subscription
router.put('/:id', requireActiveSubscription, validateUpdateProperty, updateProperty);
router.delete('/:id', requireActiveSubscription, validateGetProperty, deleteProperty);

// Property status - require active subscription
router.put('/:id/status', requireActiveSubscription, validateUpdatePropertyStatus, updatePropertyStatus);

// Property images - require active subscription
router.post('/:id/images', requireActiveSubscription, validateGetProperty, uploadPropertyImages);
router.delete('/:id/images/:imageId', requireActiveSubscription, validateGetProperty, deletePropertyImage);

// Property brochure - require active subscription
router.post('/:id/brochure', requireActiveSubscription, validateGetProperty, uploadPropertyBrochure);

export default router;