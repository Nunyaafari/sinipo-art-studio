import express from 'express';
import { adminAuth } from '../../middleware/auth/adminAuth.js';
import { getCustomerCRM } from '../../controllers/admin/customerManagementController.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', getCustomerCRM);

export default router;
