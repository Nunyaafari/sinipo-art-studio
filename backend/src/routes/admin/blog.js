import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  getAllBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogStats,
  getBlogCategories,
  getBlogTags
} from '../../controllers/admin/blogController.js';

const router = express.Router();

// Public endpoints (no auth required)
router.get('/posts', getAllBlogPosts);
router.get('/posts/:id', getBlogPost);
router.get('/categories', getBlogCategories);
router.get('/tags', getBlogTags);

// Admin endpoints (auth required)
router.use(adminAuth);

// Get blog statistics
router.get('/stats', getBlogStats);

// Get all blog posts (admin view - includes drafts)
router.get('/', getAllBlogPosts);

// Get blog post by ID or slug
router.get('/:id', getBlogPost);

// Create new blog post
router.post('/', requireRoles('admin', 'manager'), createBlogPost);

// Update blog post
router.put('/:id', requireRoles('admin', 'manager'), updateBlogPost);

// Delete blog post
router.delete('/:id', requireRoles('admin', 'manager'), deleteBlogPost);

export default router;
