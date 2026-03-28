import express from 'express';
import { upload } from '../config/upload.js';
import { adminAuth, requireRoles } from '../middleware/auth/adminAuth.js';
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
const requireUploadEditor = [adminAuth, requireRoles('admin', 'manager')];

// Public routes (no authentication required)
router.get('/info/:file_path', getFileInfo);

// Single file upload
router.post('/single', ...requireUploadEditor, upload.single('file'), uploadSingleFile);

// Multiple files upload (max 10)
router.post('/multiple', ...requireUploadEditor, upload.array('files', 10), uploadMultipleFiles);

// Specialized upload routes
router.post('/artwork', ...requireUploadEditor, upload.single('image'), uploadArtworkImage);
router.post('/avatar', ...requireUploadEditor, upload.single('avatar'), uploadUserAvatar);
router.post('/blog', ...requireUploadEditor, upload.single('image'), uploadBlogImage);

// File management
router.delete('/delete', ...requireUploadEditor, deleteUploadedFile);

export default router;
