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
router.post('/', createProperty);
router.get('/', getProperties);
router.get('/:id', getProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

// Property status
router.put('/:id/status', updatePropertyStatus);

// Property images
router.post('/:id/images', uploadPropertyImages);
router.delete('/:id/images/:imageId', deletePropertyImage);

// Property brochure
router.post('/:id/brochure', uploadPropertyBrochure);

export default router;