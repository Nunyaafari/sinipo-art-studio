import express from 'express';
import { adminAuth } from '../middleware/auth/adminAuth.js';
import {
  trackPageView,
  trackConversion,
  trackEvent,
  getAnalyticsDashboard,
  getSalesReport,
  createABTest,
  getABTestVariant,
  trackABTestConversion,
  getABTestResults,
  getUserBehavior,
  exportAnalyticsData
} from '../controllers/analyticsController.js';

const router = express.Router();

// Public tracking endpoints (no authentication required)
router.post('/track/pageview', trackPageView);
router.post('/track/conversion', trackConversion);
router.post('/track/event', trackEvent);
router.get('/ab-test/:testId/variant', getABTestVariant);
router.post('/ab-test/conversion', trackABTestConversion);

// Protected analytics endpoints (admin panel authentication required)
router.use(adminAuth);

// Dashboard and reports
router.get('/dashboard', getAnalyticsDashboard);
router.get('/sales-report', getSalesReport);
router.get('/user-behavior/:userId', getUserBehavior);
router.get('/export', exportAnalyticsData);

// A/B testing management
router.post('/ab-test', createABTest);
router.get('/ab-test/:testId/results', getABTestResults);

export default router;
