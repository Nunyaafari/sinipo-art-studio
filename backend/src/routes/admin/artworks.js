import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  getAllArtworks,
  getArtworkById,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  getArtworkStats
} from '../../controllers/admin/artworkController.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Get artwork statistics
router.get('/stats', getArtworkStats);

// Get all artworks with filtering
router.get('/', getAllArtworks);

// Get artwork by ID
router.get('/:id', getArtworkById);

// Create new artwork
router.post('/', requireRoles('admin', 'manager'), createArtwork);

// Update artwork
router.put('/:id', requireRoles('admin', 'manager'), updateArtwork);

// Delete artwork
router.delete('/:id', requireRoles('admin', 'manager'), deleteArtwork);

export default router;
