import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Commission Validation Schemas
 */

// Create Commission Validation
export const validateCreateCommission = [
  body('partner')
    .notEmpty().withMessage('Partner ID is required')
    .isMongoId().withMessage('Invalid partner ID'),

  body('property')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  body('visit')
    .optional()
    .isMongoId().withMessage('Invalid visit ID'),

  body('saleDetails.salePrice')
    .notEmpty().withMessage('Sale price is required')
    .isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),

  body('saleDetails.saleDate')
    .notEmpty().withMessage('Sale date is required')
    .isISO8601().withMessage('Sale date must be a valid date'),

  body('saleDetails.unitNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Unit number cannot exceed 50 characters'),

  body('saleDetails.buyerName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Buyer name cannot exceed 100 characters'),

  body('commission.tier')
    .optional()
    .isIn(['bronze', 'silver', 'gold', 'platinum'])
    .withMessage('Invalid commission tier'),

  body('commission.percentage')
    .notEmpty().withMessage('Commission percentage is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Commission percentage must be between 0 and 100'),

  body('commission.calculatedAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Calculated amount must be a positive number'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors
];

// Update Commission Validation
export const validateUpdateCommission = [
  param('id')
    .notEmpty().withMessage('Commission ID is required')
    .isMongoId().withMessage('Invalid commission ID'),

  body('commission.percentage')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Commission percentage must be between 0 and 100'),

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

  body('payout.method')
    .optional()
    .isIn(['bank_transfer', 'cheque', 'upi', 'cash'])
    .withMessage('Invalid payout method'),

  body('payout.reference')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Payout reference cannot exceed 100 characters'),

  body('payout.paidAt')
    .optional()
    .isISO8601().withMessage('Paid date must be a valid date'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),

  body('cancellationReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters'),

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