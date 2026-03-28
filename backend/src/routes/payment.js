import express from 'express';
import { optionalAuth } from '../middleware/auth/jwtAuth.js';
import { initializePayment, verifyPayment, getPaymentStatus } from '../controllers/paymentController.js';

const router = express.Router();

// Initialize payment transaction
router.post('/initialize', optionalAuth, initializePayment);

// Verify payment after Paystack callback
router.get('/verify/:reference', optionalAuth, verifyPayment);

// Get payment status
router.get('/status/:reference', optionalAuth, getPaymentStatus);

export default router;
