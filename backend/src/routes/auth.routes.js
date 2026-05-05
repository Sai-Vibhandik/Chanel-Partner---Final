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
  testEmail
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register/company', registerCompany);
router.post('/register/partner', registerPartner);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes
router.use(protect); // All routes below require authentication

router.post('/logout', logout);
router.get('/me', getMe);
router.post('/refresh-token', refreshToken);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.post('/test-email', testEmail);

export default router;