import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Commission Validation Schemas
 */

// Create Commission Validation
export const validateCreateCommission = [
  body('partnershipId')
    .notEmpty().withMessage('Partnership ID is required')
    .isMongoId().withMessage('Invalid partnership ID'),

  body('propertyId')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  // visitId is completely optional - can be missing, null, or empty string
  body('visitId')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    }).withMessage('Invalid visit ID'),

  body('saleDetails.salePrice')
    .notEmpty().withMessage('Sale price is required')
    .isFloat({ min: 1 }).withMessage('Sale price must be a positive number'),

  body('saleDetails.saleDate')
    .optional({ values: 'falsy' }),

  body('saleDetails.buyerName')
    .notEmpty().withMessage('Buyer name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Buyer name cannot exceed 100 characters'),

  body('saleDetails.buyerPhone')
    .notEmpty().withMessage('Buyer phone is required')
    .trim()
    .isLength({ max: 20 }).withMessage('Buyer phone cannot exceed 20 characters'),

  // buyerEmail is completely optional
  body('saleDetails.buyerEmail')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }).withMessage('Invalid email format'),

  body('source.type')
    .optional({ values: 'falsy' })
    .isIn(['visit', 'direct', 'referral', 'marketing'])
    .withMessage('Invalid source type'),

  body('source.visitId')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    }).withMessage('Invalid source visit ID'),

  body('source.notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('Source notes cannot exceed 500 characters'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors
];

// Update Commission Validation
export const validateUpdateCommission = [
  param('id')
    .notEmpty().withMessage('Commission ID is required')
    .isMongoId().withMessage('Invalid commission ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors
];

// Commission Action Validation (Approve/Reject/Pay/Cancel)
export const validateCommissionAction = [
  param('id')
    .notEmpty().withMessage('Commission ID is required')
    .isMongoId().withMessage('Invalid commission ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  body('paymentReference')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Payment reference cannot exceed 100 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'cheque', 'cash', 'other'])
    .withMessage('Invalid payment method'),

  body('overrideAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Override amount must be a positive number'),

  body('overridePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Override percentage must be between 0 and 100'),

  body('overrideReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Override reason cannot exceed 500 characters'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),

  handleValidationErrors
];

// List Commissions Validation
export const validateListCommissions = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['pending', 'approved', 'paid', 'cancelled'])
    .withMessage('Invalid status'),

  query('partnerId')
    .optional()
    .isMongoId().withMessage('Invalid partner ID'),

  query('propertyId')
    .optional()
    .isMongoId().withMessage('Invalid property ID'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),

  query('minAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum amount must be a positive number'),

  query('maxAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum amount must be a positive number'),

  handleValidationErrors
];

// Get Commission Validation
export const validateGetCommission = [
  param('id')
    .notEmpty().withMessage('Commission ID is required')
    .isMongoId().withMessage('Invalid commission ID'),

  handleValidationErrors
];

// Commission Report Validation
export const validateCommissionReport = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),

  query('partnerId')
    .optional()
    .isMongoId().withMessage('Invalid partner ID'),

  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Format must be json, csv, or excel'),

  handleValidationErrors
];

export default {
  validateCreateCommission,
  validateUpdateCommission,
  validateCommissionAction,
  validateListCommissions,
  validateGetCommission,
  validateCommissionReport
};