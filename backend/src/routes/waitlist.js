import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  getCollections,
  getCollection,
  joinWaitlist,
  leaveWaitlist,
  getUserSubscriptions,
  getWaitlistStats,
  notifySubscribers
} from '../controllers/waitlistController.js';

const router = express.Router();

// Public routes
router.get('/collections', getCollections);
router.get('/collections/:id', getCollection);
router.post('/join', joinWaitlist);
router.post('/leave', leaveWaitlist);
router.get('/subscriptions/:email', getUserSubscriptions);

// Admin routes (protected)
router.use(authenticateToken);
router.get('/stats', getWaitlistStats);
router.post('/notify', notifySubscribers);

export default router;