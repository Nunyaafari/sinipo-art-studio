import express from 'express';
import { upload } from '../config/upload.js';
import {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadArtworkImage,
  uploadUserAvatar,
  uploadBlogImage,
  deleteUploadedFile,
  getFileInfo
} from '../controllers/uploadController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/info/:file_path', getFileInfo);

// Upload routes - no authentication required for admin operations
// Single file upload
router.post('/single', upload.single('file'), uploadSingleFile);

// Multiple files upload (max 10)
router.post('/multiple', upload.array('files', 10), uploadMultipleFiles);

// Specialized upload routes
router.post('/artwork', upload.single('image'), uploadArtworkImage);
router.post('/avatar', upload.single('avatar'), uploadUserAvatar);
router.post('/blog', upload.single('image'), uploadBlogImage);

// File management
router.delete('/delete', deleteUploadedFile);

export default router;