import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Payment Validation Schemas
 */

// Initialize Registration Payment Validation
export const validateInitRegistrationPayment = [
  // Plan selection
  body('planId')
    .trim()
    .notEmpty().withMessage('Plan ID is required')
    .isMongoId().withMessage('Invalid plan ID'),

  body('billingPeriod')
    .optional()
    .isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),

  // Company data
  body('companyName')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$|^\+[1-9]\d{9,14}$/).withMessage('Please enter a valid phone number'),

  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Website cannot exceed 200 characters')
    .custom((value) => {
      // Allow URLs with or without protocol
      if (!value) return true;
      const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (!urlPattern.test(value)) {
        throw new Error('Please enter a valid website URL');
      }
      return true;
    }),

  body('regions')
    .optional()
    .isArray().withMessage('Regions must be an array'),

  body('defaultCurrency')
    .optional()
    .isIn(['INR', 'AED', 'USD']).withMessage('Currency must be INR, AED, or USD'),

  // Admin user data
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  handleValidationErrors
];

// Verify Registration Payment Validation
export const validateVerifyRegistrationPayment = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('Order ID is required'),

  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('Payment ID is required'),

  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('Payment signature is required'),

  body('registrationToken')
    .trim()
    .notEmpty().withMessage('Registration token is required'),

  handleValidationErrors
];

// Create Order Validation (for existing companies)
export const validateCreateOrder = [
  body('planId')
    .trim()
    .notEmpty().withMessage('Plan ID is required')
    .isMongoId().withMessage('Invalid plan ID'),

  body('billingPeriod')
    .optional()
    .isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),

  handleValidationErrors
];

// Verify Payment Validation (for existing companies)
export const validateVerifyPayment = [
  body('razorpay_order_id')
    .trim()
    .notEmpty().withMessage('Order ID is required'),

  body('razorpay_payment_id')
    .trim()
    .notEmpty().withMessage('Payment ID is required'),

  body('razorpay_signature')
    .trim()
    .notEmpty().withMessage('Payment signature is required'),

  handleValidationErrors
];

// Cancel Subscription Validation
export const validateCancelSubscription = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters'),

  handleValidationErrors
];

// Create Plan Validation (Admin)
export const validateCreatePlan = [
  body('name')
    .trim()
    .notEmpty().withMessage('Plan name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Plan name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('currency')
    .optional()
    .isIn(['INR', 'AED', 'USD']).withMessage('Currency must be INR, AED, or USD'),

  body('billingPeriod')
    .optional()
    .isIn(['monthly', 'yearly']).withMessage('Billing period must be monthly or yearly'),

  body('isPopular')
    .optional()
    .isBoolean().withMessage('isPopular must be a boolean'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),

  body('features')
    .optional()
    .isArray().withMessage('Features must be an array'),

  body('limits')
    .optional()
    .isObject().withMessage('Limits must be an object'),

  body('capabilities')
    .optional()
    .isObject().withMessage('Capabilities must be an object'),

  handleValidationErrors
];

// Update Plan Validation (Admin)
export const validateUpdatePlan = [
  param('id')
    .isMongoId().withMessage('Invalid plan ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Plan name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  handleValidationErrors
];

export default {
  validateInitRegistrationPayment,
  validateVerifyRegistrationPayment,
  validateCreateOrder,
  validateVerifyPayment,
  validateCancelSubscription,
  validateCreatePlan,
  validateUpdatePlan
};