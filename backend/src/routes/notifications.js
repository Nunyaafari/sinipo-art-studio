import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterSubscribers,
  sendNewsletterToAll,
  sendOrderConfirmation,
  sendShippingUpdate
} from '../controllers/notificationController.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/newsletter/subscribe', subscribeToNewsletter);
router.get('/newsletter/unsubscribe', unsubscribeFromNewsletter);

// Protected routes (authentication required)
router.use(authenticateToken);

// Admin routes for newsletter management
router.get('/newsletter/subscribers', getNewsletterSubscribers);
router.post('/newsletter/send', sendNewsletterToAll);

// Email notification triggers (for internal use)
router.post('/send-order-confirmation', async (req, res) => {
  try {
    const { order } = req.body;
    const result = await sendOrderConfirmation(order);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-shipping-update', async (req, res) => {
  try {
    const { order, trackingNumber } = req.body;
    const result = await sendShippingUpdate(order, trackingNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;