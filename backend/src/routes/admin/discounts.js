import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  getAllDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
  applyDiscountCode,
  getDiscountCodeStats
} from '../../controllers/admin/discountController.js';

const router = express.Router();

// Public endpoints (no auth required)
router.post('/validate', validateDiscountCode);
router.post('/apply', applyDiscountCode);

// Admin endpoints (auth required)
router.use(adminAuth);

// Get discount code statistics
router.get('/stats', getDiscountCodeStats);

// Get all discount codes with filtering
router.get('/', getAllDiscountCodes);

// Get discount code by ID
router.get('/:id', getDiscountCodeById);

// Create new discount code
router.post('/', requireRoles('admin', 'manager'), createDiscountCode);

// Update discount code
router.put('/:id', requireRoles('admin', 'manager'), updateDiscountCode);

// Delete discount code
router.delete('/:id', requireRoles('admin', 'manager'), deleteDiscountCode);

export default router;
