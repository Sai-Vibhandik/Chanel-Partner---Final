import express from 'express';
import {
  getPlans,
  getPlanById,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/plan.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import {
  validatePlanCreation,
  validatePlanUpdate,
  validatePlanId
} from '../validations/plan.validation.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @desc    Get all active plans (public - for pricing page)
 * @route   GET /api/plans/public
 * @access  Public
 */
router.get('/public', getPlans);

// ============================================
// ADMIN ROUTES (Platform Admin only)
// ============================================

// All routes below require authentication and platform admin role
router.use(protect);
router.use(restrictTo('platform_admin'));

/**
 * @desc    Get all plans (including inactive)
 * @route   GET /api/plans
 * @access  Private (Platform Admin)
 */
router.get('/', getAllPlans);

/**
 * @desc    Get single plan by ID
 * @route   GET /api/plans/:id
 * @access  Private (Platform Admin)
 */
router.get('/:id', validatePlanId, getPlanById);

/**
 * @desc    Create a new plan
 * @route   POST /api/plans
 * @access  Private (Platform Admin)
 */
router.post('/', validatePlanCreation, createPlan);

/**
 * @desc    Update a plan
 * @route   PUT /api/plans/:id
 * @access  Private (Platform Admin)
 */
router.put('/:id', validatePlanId, validatePlanUpdate, updatePlan);

/**
 * @desc    Delete a plan (soft delete)
 * @route   DELETE /api/plans/:id
 * @access  Private (Platform Admin)
 */
router.delete('/:id', validatePlanId, deletePlan);

export default router;