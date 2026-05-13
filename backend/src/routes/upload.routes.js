import express from 'express';
import {
  uploadDocument,
  uploadImage,
  uploadChatAttachment,
  deleteFile
} from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload routes with rate limiting (20 uploads per 15 minutes)
router.post('/chat', uploadLimiter, uploadChatAttachment);
router.post('/document', uploadLimiter, uploadDocument);
router.post('/image', uploadLimiter, uploadImage);
router.delete('/:publicId', uploadLimiter, deleteFile);

export default router;