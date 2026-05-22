import express from 'express';
import {
  getPlans,
  getPlanById,
  createOrder,
  verifyPayment,
  getSubscription,
  cancelSubscription,
  handleWebhook,
  getPaymentHistory,
  createPlan,
  updatePlan,
  deletePlan,
  getAllPlans,
  // New registration payment flow
  initRegistrationPayment,
  verifyRegistrationPayment,
  getPendingRegistration,
  cancelPendingRegistration
} from '../controllers/payment.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import {
  validateInitRegistrationPayment,
  validateVerifyRegistrationPayment,
  validateCreateOrder,
  validateVerifyPayment,
  validateCancelSubscription,
  validateCreatePlan,
  validateUpdatePlan
} from '../validations/payment.validation.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all active plans (public - for landing page, registration)
router.get('/plans', getPlans);

// Get single plan by ID (public)
router.get('/plans/:id', getPlanById);

// Webhook endpoint (public - called by Razorpay)
router.post('/webhook', handleWebhook);

// ============================================
// REGISTRATION PAYMENT FLOW (Public)
// ============================================

// Initialize registration payment - creates Razorpay order
router.post('/registration/init', validateInitRegistrationPayment, initRegistrationPayment);

// Verify registration payment - returns payment token
router.post('/registration/verify', validateVerifyRegistrationPayment, verifyRegistrationPayment);

// Get pending registration details
router.get('/registration/:token', getPendingRegistration);

// Cancel pending registration
router.delete('/registration/:token', cancelPendingRegistration);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

router.use(protect);

// Create order for subscription
router.post('/create-order', validateCreateOrder, createOrder);

// Verify payment after completion
router.post('/verify', validateVerifyPayment, verifyPayment);

// Get current subscription details
router.get('/subscription', getSubscription);

// Cancel subscription
router.post('/cancel', validateCancelSubscription, cancelSubscription);

// Get payment history
router.get('/history', getPaymentHistory);

// ============================================
// ADMIN ROUTES (Platform Admin only)
// ============================================

// Create new plan
router.post('/admin/plans', restrictTo('platform_admin'), validateCreatePlan, createPlan);

// Get all plans (including inactive)
router.get('/admin/plans', restrictTo('platform_admin'), getAllPlans);

// Update plan
router.put('/admin/plans/:id', restrictTo('platform_admin'), validateUpdatePlan, updatePlan);

// Delete plan
router.delete('/admin/plans/:id', restrictTo('platform_admin'), deletePlan);

export default router;