import express from 'express';
import { getLandingPage, updateLandingPage, resetLandingPage } from '../controllers/landingPage.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public route - no auth required
router.get('/', getLandingPage);

// Admin routes - require platform admin role
router.put('/', protect, restrictTo('platform_admin'), updateLandingPage);
router.post('/reset', protect, restrictTo('platform_admin'), resetLandingPage);

export default router;