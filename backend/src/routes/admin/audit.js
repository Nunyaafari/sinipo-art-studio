import express from 'express';
import { adminAuth, requireRoles } from '../../middleware/auth/adminAuth.js';
import { getAuditLogs, getAuditStats } from '../../controllers/admin/auditController.js';

const router = express.Router();

router.use(adminAuth);

router.get('/stats', requireRoles('admin'), getAuditStats);
router.get('/', requireRoles('admin'), getAuditLogs);

export default router;
