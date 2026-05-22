import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Plan Validation Schemas
 * Validation rules for Plan CRUD operations
 */

// Valid currencies based on Plan model
const VALID_CURRENCIES = ['INR', 'AED', 'USD'];

// Valid billing periods based on Plan model
const VALID_BILLING_PERIODS = ['monthly', 'yearly'];

/**
 * Validate plan creation
 * Required fields: name, price
 * Optional fields: currency, billingPeriod, description, features, limits, capabilities, isPopular, displayOrder, isActive
 */
export const validatePlanCreation = [
  // Plan name - required
  body('name')
    .trim()
    .notEmpty().withMessage('Plan name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Plan name must be between 2 and 100 characters'),

  // Description - optional
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  // Price - required
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
    .toFloat(),

  // Currency - optional, defaults to INR
  body('currency')
    .optional()
    .trim()
    .isIn(VALID_CURRENCIES).withMessage(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`),

  // Billing period - optional, defaults to monthly
  body('billingPeriod')
    .optional()
    .trim()
    .isIn(VALID_BILLING_PERIODS).withMessage(`Billing period must be one of: ${VALID_BILLING_PERIODS.join(', ')}`),

  // Features - optional array of strings
  body('features')
    .optional()
    .isArray().withMessage('Features must be an array'),

  body('features.*')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Each feature cannot exceed 200 characters'),

  // Limits - optional object
  body('limits')
    .optional()
    .isObject().withMessage('Limits must be an object'),

  body('limits.maxProperties')
    .optional()
    .isInt({ min: -1 }).withMessage('maxProperties must be an integer (-1 for unlimited)')
    .toInt(),

  body('limits.maxDays')
    .optional()
    .isInt({ min: 1 }).withMessage('maxDays must be a positive integer')
    .toInt(),

  // Capabilities - optional object
  body('capabilities')
    .optional()
    .isObject().withMessage('Capabilities must be an object'),

  body('capabilities.analytics')
    .optional()
    .isBoolean().withMessage('analytics capability must be a boolean')
    .toBoolean(),

  body('capabilities.advancedAnalytics')
    .optional()
    .isBoolean().withMessage('advancedAnalytics capability must be a boolean')
    .toBoolean(),

  body('capabilities.apiAccess')
    .optional()
    .isBoolean().withMessage('apiAccess capability must be a boolean')
    .toBoolean(),

  body('capabilities.whiteLabel')
    .optional()
    .isBoolean().withMessage('whiteLabel capability must be a boolean')
    .toBoolean(),

  body('capabilities.customDomain')
    .optional()
    .isBoolean().withMessage('customDomain capability must be a boolean')
    .toBoolean(),

  body('capabilities.prioritySupport')
    .optional()
    .isBoolean().withMessage('prioritySupport capability must be a boolean')
    .toBoolean(),

  body('capabilities.dedicatedManager')
    .optional()
    .isBoolean().withMessage('dedicatedManager capability must be a boolean')
    .toBoolean(),

  // Display options
  body('isPopular')
    .optional()
    .isBoolean().withMessage('isPopular must be a boolean')
    .toBoolean(),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),

  // Active status
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),

  handleValidationErrors
];

/**
 * Validate plan update
 * All fields are optional for update operations
 */
export const validatePlanUpdate = [
  // Plan name - optional
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Plan name must be between 2 and 100 characters'),

  // Description - optional
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  // Price - optional
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
    .toFloat(),

  // Currency - optional
  body('currency')
    .optional()
    .trim()
    .isIn(VALID_CURRENCIES).withMessage(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`),

  // Billing period - optional
  body('billingPeriod')
    .optional()
    .trim()
    .isIn(VALID_BILLING_PERIODS).withMessage(`Billing period must be one of: ${VALID_BILLING_PERIODS.join(', ')}`),

  // Features - optional array of strings
  body('features')
    .optional()
    .isArray().withMessage('Features must be an array'),

  body('features.*')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Each feature cannot exceed 200 characters'),

  // Limits - optional object
  body('limits')
    .optional()
    .isObject().withMessage('Limits must be an object'),

  body('limits.maxProperties')
    .optional()
    .isInt({ min: -1 }).withMessage('maxProperties must be an integer (-1 for unlimited)')
    .toInt(),

  body('limits.maxDays')
    .optional()
    .isInt({ min: 1 }).withMessage('maxDays must be a positive integer')
    .toInt(),

  // Capabilities - optional object
  body('capabilities')
    .optional()
    .isObject().withMessage('Capabilities must be an object'),

  body('capabilities.analytics')
    .optional()
    .isBoolean().withMessage('analytics capability must be a boolean')
    .toBoolean(),

  body('capabilities.advancedAnalytics')
    .optional()
    .isBoolean().withMessage('advancedAnalytics capability must be a boolean')
    .toBoolean(),

  body('capabilities.apiAccess')
    .optional()
    .isBoolean().withMessage('apiAccess capability must be a boolean')
    .toBoolean(),

  body('capabilities.whiteLabel')
    .optional()
    .isBoolean().withMessage('whiteLabel capability must be a boolean')
    .toBoolean(),

  body('capabilities.customDomain')
    .optional()
    .isBoolean().withMessage('customDomain capability must be a boolean')
    .toBoolean(),

  body('capabilities.prioritySupport')
    .optional()
    .isBoolean().withMessage('prioritySupport capability must be a boolean')
    .toBoolean(),

  body('capabilities.dedicatedManager')
    .optional()
    .isBoolean().withMessage('dedicatedManager capability must be a boolean')
    .toBoolean(),

  // Display options
  body('isPopular')
    .optional()
    .isBoolean().withMessage('isPopular must be a boolean')
    .toBoolean(),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),

  // Active status
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),

  handleValidationErrors
];

/**
 * Validate plan ID parameter
 * Used for GET, PUT, DELETE operations that require a plan ID
 */
export const validatePlanId = [
  param('id')
    .notEmpty().withMessage('Plan ID is required')
    .isMongoId().withMessage('Invalid plan ID format'),

  handleValidationErrors
];

export default {
  validatePlanCreation,
  validatePlanUpdate,
  validatePlanId
};