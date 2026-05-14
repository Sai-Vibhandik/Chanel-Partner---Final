import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Property Validation Schemas - Simplified
 */

// Create Property Validation
export const validateCreateProperty = [
  // Basic Info - only validate required fields
  body('name')
    .trim()
    .notEmpty().withMessage('Property name is required'),

  body('type')
    .notEmpty().withMessage('Property type is required'),

  body('region')
    .notEmpty().withMessage('Region is required'),

  // Location
  body('location.address')
    .optional({ checkFalsy: true })
    .trim(),

  body('location.city')
    .optional({ checkFalsy: true })
    .trim(),

  body('location.mapUrl')
    .optional({ checkFalsy: true })
    .trim(),

  // Pricing
  body('pricing.basePrice')
    .notEmpty().withMessage('Base price is required'),

  body('pricing.currency')
    .optional({ checkFalsy: true }),

  // Commission
  body('commission.basePercentage')
    .optional({ checkFalsy: true }),

  body('commission.fixedAmount')
    .optional({ checkFalsy: true }),

  body('commission.isFixed')
    .optional({ checkFalsy: true }),

  handleValidationErrors
];

// Update Property Validation - all fields optional
export const validateUpdateProperty = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  body('name')
    .optional({ checkFalsy: true })
    .trim(),

  body('type')
    .optional({ checkFalsy: true }),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid status'),

  handleValidationErrors
];

// Get Property Validation
export const validateGetProperty = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  handleValidationErrors
];

// List Properties Validation
export const validateListProperties = [
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional({ checkFalsy: true })
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid status'),

  query('type')
    .optional({ checkFalsy: true }),

  query('region')
    .optional({ checkFalsy: true }),

  handleValidationErrors
];

// Update Property Status Validation
export const validateUpdatePropertyStatus = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid status'),

  handleValidationErrors
];

export default {
  validateCreateProperty,
  validateUpdateProperty,
  validateGetProperty,
  validateListProperties,
  validateUpdatePropertyStatus
};