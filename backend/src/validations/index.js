/**
 * Validation Schemas Index
 * Export all validation schemas from a single entry point
 */

import authValidation from './auth.validation.js';
import propertyValidation from './property.validation.js';
import visitValidation from './visit.validation.js';
import commissionValidation from './commission.validation.js';
import {
  handleValidationErrors,
  sanitizeRequestBody,
  isValidObjectId,
  validateFileUpload,
  commonValidation,
  customValidators
} from '../middlewares/validation.middleware.js';

export {
  // Auth validations
  ...authValidation,

  // Property validations
  ...propertyValidation,

  // Visit validations
  ...visitValidation,

  // Commission validations
  ...commissionValidation,

  // Common utilities
  handleValidationErrors,
  sanitizeRequestBody,
  isValidObjectId,
  validateFileUpload,
  commonValidation,
  customValidators
};

export default {
  auth: authValidation,
  property: propertyValidation,
  visit: visitValidation,
  commission: commissionValidation
};