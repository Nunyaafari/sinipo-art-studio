import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  getCertificates,
  generateCertificate,
  downloadCertificate,
  generateCertificateImage,
  verifyCertificate,
  getCertificateStats
} from '../controllers/certificateController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/verify/:certificateNumber', verifyCertificate);

// Protected routes (authentication required)
router.use(authenticateToken);

// Get user certificates
router.get('/', getCertificates);

// Generate new certificate
router.post('/generate', generateCertificate);

// Download certificate as PDF
router.get('/:id/download', downloadCertificate);

// Generate certificate as image
router.get('/:id/image', generateCertificateImage);

// Get certificate statistics
router.get('/stats', getCertificateStats);

export default router;