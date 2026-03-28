import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRoutes from './routes/payment.js';
import orderRoutes from './routes/orders.js';
import adminArtworkRoutes from './routes/admin/artworks.js';
import adminDiscountRoutes from './routes/admin/discounts.js';
import adminBlogRoutes from './routes/admin/blog.js';
import adminMediaRoutes from './routes/admin/media.js';
import adminSettingsRoutes from './routes/admin/settings.js';
import adminAuditRoutes from './routes/admin/audit.js';
import adminUsersRoutes from './routes/admin/users.js';
import adminCustomersRoutes from './routes/admin/customers.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import socialRoutes from './routes/social.js';
import uploadRoutes from './routes/upload.js';
import paymentMethodRoutes from './routes/paymentMethods.js';
import certificateRoutes from './routes/certificates.js';
import notificationRoutes from './routes/notifications.js';
import shoppingRoutes from './routes/shopping.js';
import seoRoutes from './routes/seo.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';
import waitlistRoutes from './routes/waitlist.js';
import { requestLogger, errorLogger, registerProcessMonitoring } from './utils/logger.js';
import { validateConfig } from './config/environment.js';
import { initializeRuntimeDatabaseState } from './storage/runtimeDatabaseState.js';

dotenv.config();
registerProcessMonitoring();

const app = express();
const PORT = process.env.PORT || 3001;
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;
export const runtimeStateReady = initializeRuntimeDatabaseState();
const firebaseProjectId = (() => {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '';
  } catch {
    return '';
  }
})();
const googleProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || firebaseProjectId || '';
const allowedOrigins = new Set(
  [
    ...((process.env.FRONTEND_URL || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    googleProjectId ? `https://${googleProjectId}.web.app` : '',
    googleProjectId ? `https://${googleProjectId}.firebaseapp.com` : ''
  ].filter(Boolean)
);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Validate configuration
validateConfig();

// Request logging middleware
app.use(requestLogger);

// Health check routes
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/waitlist', waitlistRoutes);

// Admin routes
app.use('/api/admin/artworks', adminArtworkRoutes);
app.use('/api/admin/discounts', adminDiscountRoutes);
app.use('/api/admin/blog', adminBlogRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/audit', adminAuditRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/customers', adminCustomersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

export const startServer = async (port = PORT) => {
  await runtimeStateReady;

  return app.listen(port, () => {
    console.log(`🚀 Sinipo Art Backend running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (executedFilePath === currentFilePath) {
  startServer().catch((error) => {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  });
}

export default app;
