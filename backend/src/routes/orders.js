import express from 'express';
import { getOrder, getAllOrders, updateOrderStatus } from '../controllers/orderController.js';
import { adminAuth, requireRoles } from '../middleware/auth/adminAuth.js';

const router = express.Router();

// Get order by reference
router.get('/:reference', getOrder);

// Get all orders (admin endpoint)
router.get('/', adminAuth, getAllOrders);

// Update order status
router.patch('/:reference/status', adminAuth, requireRoles('admin', 'manager'), updateOrderStatus);

export default router;
