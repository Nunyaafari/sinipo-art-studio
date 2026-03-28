import express from 'express';
import { authenticateToken } from '../middleware/auth/jwtAuth.js';
import {
  register,
  login,
  socialLogin,
  getBootstrapStatus,
  bootstrapAdmin,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  logout,
  getUserStats
} from '../controllers/authController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/bootstrap-status', getBootstrapStatus);
router.post('/bootstrap-admin', bootstrapAdmin);
router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

// Protected routes (authentication required)
router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/resend-verification', resendVerification);
router.post('/logout', logout);

// Admin routes
router.get('/stats', getUserStats);

export default router;
