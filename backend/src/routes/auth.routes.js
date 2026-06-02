import express from 'express';
import {
  registerCompany,
  registerPartner,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  refreshToken,
  updateProfile,
  changePassword,
  testEmail,
  checkEmailAvailability
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import {
  loginLimiter,
  registrationLimiter,
  passwordResetLimiter,
  authLimiter
} from '../middlewares/rateLimit.middleware.js';
import {
  validateRegisterCompany,
  validateRegisterPartner,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateVerifyEmail,
  validateResendVerification
} from '../validations/auth.validation.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Registration endpoints - Strict rate limiting + Validation
router.post('/register/company', registrationLimiter, validateRegisterCompany, registerCompany);
router.post('/register/partner', registrationLimiter, validateRegisterPartner, registerPartner);

// Login endpoint - Very strict rate limiting + Validation
router.post('/login', loginLimiter, validateLogin, login);

// Token refresh - Public but requires refresh token in cookie
// This must be PUBLIC because it's called when access token is expired
router.post('/refresh-token', authLimiter, refreshToken);

// Password reset endpoints - Strict rate limiting + Validation
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, validateResetPassword, resetPassword);

// Email verification - Moderate rate limiting + Validation
router.post('/verify-email/:token', authLimiter, validateVerifyEmail, verifyEmail);
router.post('/resend-verification', authLimiter, validateResendVerification, resendVerificationEmail);

// Check email availability - for registration validation
router.post('/check-email', authLimiter, checkEmailAvailability);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', validateUpdateProfile, updateProfile);
router.put('/password', validateChangePassword, changePassword);
router.post('/test-email', testEmail);

export default router;