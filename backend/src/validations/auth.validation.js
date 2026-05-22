import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Authentication Validation Schemas
 */

// Company Registration Validation
export const validateRegisterCompany = [
  // Payment token is now required for all registrations
  body('paymentToken')
    .trim()
    .notEmpty().withMessage('Payment token is required')
    .isJWT().withMessage('Invalid payment token'),

  handleValidationErrors
];

// Partner Registration Validation
export const validateRegisterPartner = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email cannot exceed 255 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

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

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$|^\+[1-9]\d{9,14}$/).withMessage('Please enter a valid phone number'),

  // Partner Profile
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters'),

  body('companyType')
    .optional()
    .isIn(['individual', 'proprietorship', 'partnership', 'llp', 'pvtltd', 'freelancer'])
    .withMessage('Invalid company type'),

  body('operatingRegion')
    .optional()
    .isIn(['india', 'dubai', 'both'])
    .withMessage('Operating region must be india, dubai, or both'),

  // India-specific fields
  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid GST number'),

  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please enter a valid PAN number'),

  // Dubai-specific fields
  body('tradeLicenseNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Trade license number cannot exceed 50 characters'),

  // Company to apply to
  body('companyId')
    .optional()
    .trim()
    .isMongoId().withMessage('Invalid company ID'),

  handleValidationErrors
];

// Login Validation
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors
];

// Forgot Password Validation
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

// Reset Password Validation
export const validateResetPassword = [
  param('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 32, max: 128 }).withMessage('Invalid reset token'),

  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// Change Password Validation
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors
];

// Update Profile Validation
export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$|^\+[1-9]\d{9,14}$/).withMessage('Please enter a valid phone number'),

  body('avatar')
    .optional()
    .isObject().withMessage('Avatar must be an object with url and publicId'),

  body('avatar.url')
    .optional()
    .isURL().withMessage('Avatar URL must be a valid URL'),

  body('avatar.publicId')
    .optional()
    .trim(),

  handleValidationErrors
];

// Email Verification Validation
export const validateVerifyEmail = [
  param('token')
    .notEmpty().withMessage('Verification token is required')
    .isLength({ min: 32, max: 128 }).withMessage('Invalid verification token'),

  handleValidationErrors
];

// Resend Verification Validation
export const validateResendVerification = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

export default {
  validateRegisterCompany,
  validateRegisterPartner,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateVerifyEmail,
  validateResendVerification
};