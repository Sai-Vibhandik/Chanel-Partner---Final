import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Input Validation Middleware
 *
 * Provides comprehensive validation and sanitization for all API inputs
 * Using express-validator for request validation
 */

/**
 * Custom validation result handler
 * Returns formatted errors if validation fails
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Custom Validators
 */
export const customValidators = {
  // Validate MongoDB ObjectId
  isObjectId: (value) => {
    return mongoose.Types.ObjectId.isValid(value);
  },

  // Validate phone number (Indian and international)
  isPhoneNumber: (value) => {
    // Indian: 10 digits starting with 6-9
    // International: + followed by 10-15 digits
    const indianPhone = /^[6-9]\d{9}$/;
    const internationalPhone = /^\+[1-9]\d{9,14}$/;
    return indianPhone.test(value) || internationalPhone.test(value);
  },

  // Validate GST number (India)
  isGstNumber: (value) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(value);
  },

  // Validate PAN number (India)
  isPanNumber: (value) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(value);
  },

  // Validate RERA number
  isReraNumber: (value) => {
    // Basic RERA format validation
    const reraRegex = /^[A-Z]{2}\d{6,12}$/;
    return reraRegex.test(value);
  },

  // Validate website URL
  isWebsite: (value) => {
    if (!value) return true; // Optional
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },

  // Validate currency
  isCurrency: (value) => {
    return ['INR', 'AED', 'USD'].includes(value);
  },

  // Validate password strength
  isStrongPassword: (value) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(value);
  }
};

/**
 * Common Validation Rules
 */
export const commonValidation = {
  // Email validation
  email: body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters'),

  // Password validation
  password: body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .custom((value) => {
      if (!customValidators.isStrongPassword(value)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      return true;
    }),

  // Password (optional - for updates)
  passwordOptional: body('password')
    .optional()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .custom((value) => {
      if (value && !customValidators.isStrongPassword(value)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      return true;
    }),

  // Name validation
  firstName: body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  // Phone validation
  phone: body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .custom((value) => {
      if (!customValidators.isPhoneNumber(value.replace(/[\s-]/g, ''))) {
        throw new Error('Please enter a valid phone number');
      }
      return true;
    }),

  // Phone (optional)
  phoneOptional: body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !customValidators.isPhoneNumber(value.replace(/[\s-]/g, ''))) {
        throw new Error('Please enter a valid phone number');
      }
      return true;
    }),

  // ObjectId validation
  objectId: (field = 'id') => param(field)
    .notEmpty().withMessage(`${field} is required`)
    .custom((value) => {
      if (!customValidators.isObjectId(value)) {
        throw new Error(`Invalid ${field} format`);
      }
      return true;
    }),

  // ObjectId in body
  objectIdBody: (field) => body(field)
    .optional()
    .custom((value) => {
      if (value && !customValidators.isObjectId(value)) {
        throw new Error(`Invalid ${field} format`);
      }
      return true;
    }),

  // MongoDB ObjectId array
  objectIdArray: (field) => body(field)
    .optional()
    .isArray().withMessage(`${field} must be an array`)
    .custom((arr) => {
      if (arr && arr.length > 0) {
        for (const id of arr) {
          if (!customValidators.isObjectId(id)) {
            throw new Error(`Invalid ObjectId in ${field}`);
          }
        }
      }
      return true;
    }),

  // String validation
  stringRequired: (field, minLength = 1, maxLength = 500) => body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ min: minLength, max: maxLength }).withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  // String optional
  stringOptional: (field, maxLength = 500) => body(field)
    .optional()
    .trim()
    .isLength({ max: maxLength }).withMessage(`${field} cannot exceed ${maxLength} characters`),

  // Number validation
  numberRequired: (field, min = 0, max = null) => body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isFloat({ min }).withMessage(`${field} must be a valid number${min !== null ? ` greater than or equal to ${min}` : ''}`)
    .custom((value) => {
      if (max !== null && value > max) {
        throw new Error(`${field} cannot exceed ${max}`);
      }
      return true;
    }),

  // Number optional
  numberOptional: (field, min = 0) => body(field)
    .optional()
    .isFloat({ min }).withMessage(`${field} must be a valid number greater than or equal to ${min}`),

  // Integer validation
  integerRequired: (field, min = 0) => body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isInt({ min }).withMessage(`${field} must be a valid integer greater than or equal to ${min}`),

  // Boolean validation
  booleanOptional: (field) => body(field)
    .optional()
    .isBoolean().withMessage(`${field} must be a boolean value`),

  // Enum validation
  enumRequired: (field, allowedValues) => body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isIn(allowedValues).withMessage(`${field} must be one of: ${allowedValues.join(', ')}`),

  // Enum optional
  enumOptional: (field, allowedValues) => body(field)
    .optional()
    .isIn(allowedValues).withMessage(`${field} must be one of: ${allowedValues.join(', ')}`),

  // Date validation
  dateRequired: (field) => body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isISO8601().withMessage(`${field} must be a valid date`)
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`${field} must be a valid date`);
      }
      return true;
    }),

  // Date optional
  dateOptional: (field) => body(field)
    .optional()
    .isISO8601().withMessage(`${field} must be a valid date`)
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`${field} must be a valid date`);
        }
      }
      return true;
    }),

  // Future date validation
  futureDateRequired: (field) => body(field)
    .notEmpty().withMessage(`${field} is required`)
    .isISO8601().withMessage(`${field} must be a valid date`)
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error(`${field} must be a future date`);
      }
      return true;
    }),

  // Website URL
  websiteOptional: body('website')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !customValidators.isWebsite(value)) {
        throw new Error('Please enter a valid website URL');
      }
      return true;
    }),

  // GST Number
  gstOptional: body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom((value) => {
      if (value && !customValidators.isGstNumber(value)) {
        throw new Error('Please enter a valid GST number');
      }
      return true;
    }),

  // PAN Number
  panOptional: body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom((value) => {
      if (value && !customValidators.isPanNumber(value)) {
        throw new Error('Please enter a valid PAN number');
      }
      return true;
    }),

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt()
  ],

  // Search query
  searchQuery: query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query cannot exceed 100 characters')
    .escape()
};

/**
 * Sanitize request body - remove unexpected fields
 * @param {string[]} allowedFields - Array of allowed field names
 */
export const sanitizeRequestBody = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitizedBody = {};
      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field)) {
          sanitizedBody[field] = req.body[field];
        }
      }
      req.body = sanitizedBody;
    }
    next();
  };
};

/**
 * Check if a string is a valid MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) &&
    new mongoose.Types.ObjectId(id).toString() === id;
};

/**
 * Validate file upload
 */
export const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.files && !req.file) {
      if (required) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
        });
      }
      return next();
    }

    const file = req.files?.file || req.file;

    if (Array.isArray(file)) {
      for (const f of file) {
        if (!validateSingleFile(f, maxSize, allowedMimeTypes, res)) {
          return;
        }
      }
    } else {
      if (!validateSingleFile(file, maxSize, allowedMimeTypes, res)) {
        return;
      }
    }

    next();
  };
};

/**
 * Validate a single file
 */
const validateSingleFile = (file, maxSize, allowedMimeTypes, res) => {
  if (file.size > maxSize) {
    res.status(400).json({
      success: false,
      message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
    });
    return false;
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    res.status(400).json({
      success: false,
      message: `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
    });
    return false;
  }

  return true;
};

export default {
  handleValidationErrors,
  customValidators,
  commonValidation,
  sanitizeRequestBody,
  isValidObjectId,
  validateFileUpload
};