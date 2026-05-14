import express from 'express';
import {
  getAvailability,
  updateAvailability,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlotsForOffice,
  getAllAvailabilities
} from '../controllers/availability.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ==================== PUBLIC ROUTES (Partners) ====================

// Get available slots for a specific office and date range
router.get(
  '/offices/:officeId/available-slots',
  protect,
  getAvailableSlotsForOffice
);

// Get availability for a specific office (read-only for partners)
router.get(
  '/offices/:officeId/availability',
  protect,
  getAvailability
);

// ==================== ADMIN ROUTES (Company SuperAdmin, Partner Manager) ====================

// Get all availabilities for company's offices
router.get(
  '/offices/availabilities',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  getAllAvailabilities
);

// Create or update availability for a specific office
router.put(
  '/offices/:officeId/availability',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  updateAvailability
);

// Add blocked date
router.post(
  '/offices/:officeId/availability/blocked-dates',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  addBlockedDate
);

// Remove blocked date
router.delete(
  '/offices/:officeId/availability/blocked-dates/:dateId',
  protect,
  restrictTo('company_superadmin', 'partner_manager'),
  removeBlockedDate
);

export default router;