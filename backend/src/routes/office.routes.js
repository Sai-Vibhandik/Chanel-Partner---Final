import express from 'express';
import {
  // Office Locations
  getOfficeLocations,
  getOfficeLocation,
  createOfficeLocation,
  updateOfficeLocation,
  deleteOfficeLocation,
  // Time Slots
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  getAvailableSlots,
  getAvailableOffices
} from '../controllers/office.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ==================== PARTNER ROUTES ====================

// Get available offices for partner
router.get(
  '/available',
  protect,
  restrictTo('partner'),
  getAvailableOffices
);

// Get available slots for a date
router.get(
  '/available-slots',
  protect,
  getAvailableSlots
);

// ==================== ADMIN ROUTES (Company SuperAdmin, Partner Manager) ====================

// Office Locations - Static routes FIRST, then parameterized routes
router.get(
  '/',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  getOfficeLocations
);

// Time Slots - Must come BEFORE /:id route
router.get(
  '/slots',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  getTimeSlots
);

router.post(
  '/slots',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  createTimeSlot
);

router.put(
  '/slots/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  updateTimeSlot
);

router.delete(
  '/slots/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  deleteTimeSlot
);

// Single Office Location - Must come AFTER all static routes
router.get(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  getOfficeLocation
);

router.post(
  '/',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  createOfficeLocation
);

router.put(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  updateOfficeLocation
);

router.delete(
  '/:id',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  deleteOfficeLocation
);

export default router;