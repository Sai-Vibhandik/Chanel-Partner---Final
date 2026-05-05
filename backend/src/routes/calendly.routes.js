import express from 'express';
import { handleCalendlyWebhook, getCalendlyUrl, generateCalendlyUrlWithTracking } from '../controllers/calendly.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public webhook endpoint (verified via signature)
router.post('/webhook', handleCalendlyWebhook);

// Protected endpoints
router.get(
  '/offices/:id/calendly-url',
  protect,
  getCalendlyUrl
);

router.post(
  '/generate-url',
  protect,
  restrictTo('partner'),
  generateCalendlyUrlWithTracking
);

export default router;