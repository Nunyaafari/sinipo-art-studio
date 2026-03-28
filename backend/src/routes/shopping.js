import express from 'express';
import { optionalAuth, authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  getCatalogProducts,
  getStorefrontConfig,
  trackProductView,
  getRecentlyViewed,
  getRecommendations,
  advancedSearch,
  getSearchSuggestions,
  getTrendingSearches,
  getProductStats
} from '../controllers/shoppingController.js';

const router = express.Router();

// Public routes (optional authentication)
router.use(optionalAuth);

// Get catalog products
router.get('/products', getCatalogProducts);

// Get storefront configuration
router.get('/config', getStorefrontConfig);

// Track product view
router.post('/track-view', trackProductView);

// Get recently viewed products
router.get('/recently-viewed', getRecentlyViewed);

// Get product recommendations
router.get('/recommendations', getRecommendations);

// Advanced search with filters
router.get('/search', advancedSearch);

// Get search suggestions
router.get('/search/suggestions', getSearchSuggestions);

// Get trending searches
router.get('/search/trending', getTrendingSearches);

// Get product statistics
router.get('/products/:productId/stats', getProductStats);

export default router;
