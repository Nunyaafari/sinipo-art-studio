import express from 'express';
import {
  healthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck
} from '../controllers/healthController.js';

const router = express.Router();

// Basic health check
router.get('/', healthCheck);

// Detailed health check (for monitoring systems)
router.get('/detailed', detailedHealthCheck);

// Readiness probe (for Kubernetes)
router.get('/ready', readinessCheck);

// Liveness probe (for Kubernetes)
router.get('/alive', livenessCheck);

export default router;