import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  getMediaAsset,
  getMediaAssets,
  patchMediaAsset,
  removeMediaAsset
} from '../../controllers/admin/mediaController.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', getMediaAssets);
router.get('/:id', getMediaAsset);
router.patch('/:id', requireRoles('admin', 'manager'), patchMediaAsset);
router.delete('/:id', requireRoles('admin', 'manager'), removeMediaAsset);

export default router;
