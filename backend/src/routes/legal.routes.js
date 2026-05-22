import express from 'express';
import { protect, platformAdminOnly } from '../middlewares/auth.middleware.js';
import {
  getAllLegalPages,
  getLegalPageBySlug,
  upsertLegalPage,
  deleteLegalPage,
} from '../controllers/legal.controller.js';

const router = express.Router();

// Public routes - completely public, no auth needed
router.get('/:slug', getLegalPageBySlug);

// Platform Admin routes - require authentication
router.get('/', protect, platformAdminOnly, getAllLegalPages);
router.put('/:slug', protect, platformAdminOnly, upsertLegalPage);
router.delete('/:slug', protect, platformAdminOnly, deleteLegalPage);

export default router;