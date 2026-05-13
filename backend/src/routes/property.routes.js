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
  getPropertiesForPartnership
} from '../controllers/property.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
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

// Get property statistics (company staff and viewer)
router.get('/stats', restrictTo('company_superadmin', 'partner_manager', 'property_manager', 'finance_manager', 'viewer'), getPropertyStats);

// Property CRUD (company staff)
// Note: Access control is handled within each controller
router.post('/', validateCreateProperty, createProperty);
router.get('/', validateListProperties, getProperties);
router.get('/:id', validateGetProperty, getProperty);
router.put('/:id', validateUpdateProperty, updateProperty);
router.delete('/:id', validateGetProperty, deleteProperty);

// Property status
router.put('/:id/status', validateUpdatePropertyStatus, updatePropertyStatus);

// Property images
router.post('/:id/images', validateGetProperty, uploadPropertyImages);
router.delete('/:id/images/:imageId', validateGetProperty, deletePropertyImage);

// Property brochure
router.post('/:id/brochure', validateGetProperty, uploadPropertyBrochure);

export default router;