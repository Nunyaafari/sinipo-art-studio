import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser
} from '../../controllers/admin/userManagementController.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', requireRoles('admin'), getAdminUsers);
router.post('/', requireRoles('admin'), createAdminUser);
router.patch('/:id', requireRoles('admin'), updateAdminUser);
router.delete('/:id', requireRoles('admin'), deleteAdminUser);

export default router;
