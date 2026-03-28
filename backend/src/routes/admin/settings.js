import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  getStorefrontSettingsAdmin,
  updateStorefrontSettingsAdmin
} from '../../controllers/admin/settingsController.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', requireRoles('admin'), getStorefrontSettingsAdmin);
router.put('/', requireRoles('admin'), updateStorefrontSettingsAdmin);
router.post('/', requireRoles('admin'), updateStorefrontSettingsAdmin);

export default router;
