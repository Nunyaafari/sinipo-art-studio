import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getPaymentMethodStats
} from '../controllers/paymentMethodController.js';

const router = express.Router();

// All payment method routes require authentication
router.use(authenticateToken);

// Get user payment methods
router.get('/', getPaymentMethods);

// Add new payment method
router.post('/', addPaymentMethod);

// Set default payment method
router.patch('/:id/default', setDefaultPaymentMethod);

// Delete payment method
router.delete('/:id', deletePaymentMethod);

// Get payment method statistics
router.get('/stats', getPaymentMethodStats);

export default router;