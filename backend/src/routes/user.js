import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getOrderHistory,
  addOrderToHistory,
  getUserReviews,
  addReview,
  getLoyaltyPoints,
  getRecommendations,
  getUserStats
} from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

// Order history routes
router.get('/orders', getOrderHistory);
router.post('/orders', addOrderToHistory);

// Review routes
router.get('/reviews', getUserReviews);
router.post('/reviews', addReview);

// Loyalty program routes
router.get('/loyalty', getLoyaltyPoints);

// Personalization routes
router.get('/recommendations', getRecommendations);

// User statistics
router.get('/stats', getUserStats);

export default router;