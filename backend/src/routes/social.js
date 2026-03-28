import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth/jwtAuth.js';
import {
  getPublicProfile,
  followUser,
  unfollowUser,
  getUserFollows,
  createGallery,
  getUserGalleries,
  updateGallery,
  deleteGallery,
  shareArtwork,
  getActivityFeed,
  getSocialStats,
  getTrendingArtworks
} from '../controllers/socialController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/profile/:userId', getPublicProfile);
router.get('/trending', getTrendingArtworks);

// Optional authentication (doesn't fail if no token)
router.use(optionalAuth);

// Protected routes (authentication required)
router.use(authenticateToken);

// Follow system
router.post('/follow', followUser);
router.delete('/unfollow/:targetUserId', unfollowUser);
router.get('/follows', getUserFollows);

// Gallery management
router.post('/galleries', createGallery);
router.get('/galleries', getUserGalleries);
router.put('/galleries/:id', updateGallery);
router.delete('/galleries/:id', deleteGallery);

// Social sharing
router.post('/share', shareArtwork);

// Activity feed
router.get('/activity', getActivityFeed);

// Social statistics
router.get('/stats', getSocialStats);

export default router;