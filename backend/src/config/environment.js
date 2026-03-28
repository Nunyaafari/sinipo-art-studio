import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment configuration with validation
const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'sinipo_art',
    url: process.env.DATABASE_URL
  },

  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Paystack Configuration
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Upload storage configuration
  uploads: {
    storage: process.env.UPLOAD_STORAGE === 'cloudinary' ? 'cloudinary' : 'local',
    backendPublicUrl: process.env.BACKEND_PUBLIC_URL || process.env.MEDIA_BASE_URL || '',
    localPath: process.env.UPLOAD_LOCAL_PATH || 'uploads'
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  // Social Login (for future use)
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET
    }
  },

  // Analytics
  analytics: {
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
    sentryDsn: process.env.SENTRY_DSN
  },

  monitoring: {
    logFilePath: process.env.LOG_FILE_PATH,
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL
  },

  // Redis (for caching)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD
  },

  // Backup Configuration
  backup: {
    s3Bucket: process.env.BACKUP_S3_BUCKET,
    s3Region: process.env.BACKUP_S3_REGION || 'us-east-1',
    s3AccessKey: process.env.BACKUP_S3_ACCESS_KEY,
    s3SecretKey: process.env.BACKUP_S3_SECRET_KEY
  }
};

// Validation function
export const validateConfig = () => {
  const required = [
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  const insecureJwtSecret = process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production';
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using an ephemeral development JWT secret for this process - NOT recommended for production!');
  }

  if (insecureJwtSecret) {
    console.warn('⚠️  JWT_SECRET is set to the sample placeholder value. Replace it before sharing this environment.');
  }

  // Validate Paystack keys in production
  if (config.nodeEnv === 'production') {
    if (!config.jwt.secret || insecureJwtSecret) {
      console.error('❌ A real JWT_SECRET is required in production!');
      process.exit(1);
    }

    if (!config.paystack.secretKey || !config.paystack.publicKey) {
      console.warn('⚠️  Paystack env keys are not configured. Runtime payment settings will be used if present.');
    }

    if (config.uploads.storage === 'cloudinary') {
      if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
        console.error('❌ Cloudinary credentials are required when UPLOAD_STORAGE=cloudinary');
        process.exit(1);
      }
    }
  }

  return config;
};

// Environment-specific configurations
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';

// Export configuration
export default config;
