import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Visit Validation Schemas
 */

// Book Visit Validation
export const validateBookVisit = [
  body('propertyId')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  body('partnershipId')
    .notEmpty().withMessage('Partnership ID is required')
    .isMongoId().withMessage('Invalid partnership ID'),

  body('scheduledDate')
    .notEmpty().withMessage('Scheduled date is required')
    .isISO8601().withMessage('Scheduled date must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (date < now) {
        throw new Error('Scheduled date must be today or a future date');
      }
      return true;
    }),

  body('scheduledTime')
    .notEmpty().withMessage('Scheduled time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),

  body('officeLocation')
    .optional()
    .isMongoId().withMessage('Invalid office location ID'),

  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Purpose cannot exceed 500 characters'),

  body('hasClient')
    .optional()
    .isBoolean().withMessage('hasClient must be a boolean'),

  // Client details - only validate if hasClient is true
  body('clientDetails.name')
    .custom((value, { req }) => {
      if (req.body.hasClient && (!value || value.trim() === '')) {
        throw new Error('Client name is required when bringing a client');
      }
      if (value && value.length > 100) {
        throw new Error('Client name cannot exceed 100 characters');
      }
      return true;
    }),

  body('clientDetails.phone')
    .custom((value, { req }) => {
      if (req.body.hasClient && (!value || value.trim() === '')) {
        throw new Error('Client phone is required when bringing a client');
      }
      if (value && value.trim() !== '') {
        const phoneRegex = /^[6-9]\d{9}$|^\+[1-9]\d{9,14}$/;
        if (!phoneRegex.test(value.trim())) {
          throw new Error('Please enter a valid phone number');
        }
      }
      return true;
    }),

  body('clientDetails.email')
    .optional()
    .trim()
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          throw new Error('Please enter a valid email address');
        }
      }
      return true;
    }),

  body('clientDetails.notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Client notes cannot exceed 500 characters'),

  body('partnerNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors
];

// Update Visit Validation
export const validateUpdateVisit = [
  param('id')
    .notEmpty().withMessage('Visit ID is required')
    .isMongoId().withMessage('Invalid visit ID'),

  body('scheduledDate')
    .optional()
    .isISO8601().withMessage('Scheduled date must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (date < now) {
        throw new Error('Scheduled date must be today or a future date');
      }
      return true;
    }),

  body('scheduledTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),

  body('clientName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Client name cannot exceed 100 characters'),

  body('clientPhone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$|^\+[1-9]\d{9,14}$/).withMessage('Please enter a valid phone number'),

  body('clientEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors
];

// Cancel Visit Validation
export const validateCancelVisit = [
  param('id')
    .notEmpty().withMessage('Visit ID is required')
    .isMongoId().withMessage('Invalid visit ID'),

  body('cancellationReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Cancellation reason cannot exceed 500 characters'),

  handleValidationErrors
];

// Complete Visit Validation
export const validateCompleteVisit = [
  param('id')
    .notEmpty().withMessage('Visit ID is required')
    .isMongoId().withMessage('Invalid visit ID'),

  body('feedback.rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('feedback.comments')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comments cannot exceed 1000 characters'),

  body('feedback.clientInterested')
    .optional()
    .isBoolean().withMessage('Client interested must be a boolean'),

  body('dealDetails.dealStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled'])
    .withMessage('Invalid deal status'),

  body('dealDetails.dealValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Deal value must be a positive number'),

  body('dealDetails.expectedClosingDate')
    .optional()
    .isISO8601().withMessage('Expected closing date must be a valid date'),

  handleValidationErrors
];

// Approve/Reject Visit Validation
export const validateVisitAction = [
  param('id')
    .notEmpty().withMessage('Visit ID is required')
    .isMongoId().withMessage('Invalid visit ID'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Rejection reason cannot exceed 500 characters'),

  handleValidationErrors
];

// List Visits Validation
export const validateListVisits = [
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
    .isIn(['pending', 'approved', 'completed', 'cancelled', 'rejected', 'no_show'])
    .withMessage('Invalid status'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  query('propertyId')
    .optional()
    .isMongoId().withMessage('Invalid property ID'),

  query('partnerId')
    .optional()
    .isMongoId().withMessage('Invalid partner ID'),

  handleValidationErrors
];

// Get Visit Validation
export const validateGetVisit = [
  param('id')
    .notEmpty().withMessage('Visit ID is required')
    .isMongoId().withMessage('Invalid visit ID'),

  handleValidationErrors
];

// Calendar Validation
export const validateCalendarQuery = [
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),

  query('year')
    .optional()
    .isInt({ min: 2020, max: 2100 }).withMessage('Year must be between 2020 and 2100'),

  query('officeId')
    .optional()
    .isMongoId().withMessage('Invalid office ID'),

  handleValidationErrors
];

export default {
  validateBookVisit,
  validateUpdateVisit,
  validateCancelVisit,
  validateCompleteVisit,
  validateVisitAction,
  validateListVisits,
  validateGetVisit,
  validateCalendarQuery
};