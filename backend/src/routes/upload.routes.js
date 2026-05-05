import express from 'express';
import {
  uploadDocument,
  uploadImage,
  uploadChatAttachment,
  deleteFile
} from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload routes
router.post('/chat', uploadChatAttachment);
router.post('/document', uploadDocument);
router.post('/image', uploadImage);
router.delete('/:publicId', deleteFile);

export default router;