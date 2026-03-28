import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL',
  'BACKEND_PUBLIC_URL',
  'JWT_SECRET',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY'
];

const uploadStorage = process.env.UPLOAD_STORAGE === 'cloudinary' ? 'cloudinary' : 'local';
const databaseConfigured = Boolean(process.env.DATABASE_URL) || Boolean(
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
);

if (!databaseConfigured) {
  required.push('DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME');
}

if (uploadStorage === 'cloudinary') {
  required.push('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
}

const missing = required.filter((key) => {
  if (key.includes(' or ')) {
    return !databaseConfigured;
  }

  return !process.env[key];
});

if (missing.length > 0) {
  console.error('Missing required production environment variables:');
  missing.forEach((key) => console.error(`- ${key}`));
  process.exit(1);
}

if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  console.error('JWT_SECRET cannot use the sample placeholder value in production.');
  process.exit(1);
}

console.log('Production environment variables look complete.');
console.log(`Upload storage mode: ${uploadStorage}`);
console.log(`Database mode: ${process.env.DATABASE_URL ? 'DATABASE_URL' : 'DB_* variables'}`);
