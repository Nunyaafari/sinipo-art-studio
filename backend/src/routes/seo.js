import express from 'express';
import {
  generateSitemap,
  generateRobotsTxt,
  getMetaTags,
  getProductSchema,
  getOrganizationSchema,
  getBreadcrumbSchema,
  getWebsiteSchema,
  getPageSchemas
} from '../controllers/seoController.js';

const router = express.Router();

// Public SEO endpoints
router.get('/sitemap.xml', generateSitemap);
router.get('/robots.txt', generateRobotsTxt);
router.get('/meta-tags', getMetaTags);
router.get('/schema/product/:id', getProductSchema);
router.get('/schema/organization', getOrganizationSchema);
router.get('/schema/breadcrumb', getBreadcrumbSchema);
router.get('/schema/website', getWebsiteSchema);
router.get('/schema/page', getPageSchemas);

export default router;