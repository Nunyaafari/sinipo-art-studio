import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const isDatabaseConfigured = Boolean(process.env.DATABASE_URL) || Boolean(
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
);

// Database configuration
const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'sinipo_art'
      }),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle instance
export const db = drizzle(pool);
export { pool };

// Test database connection
export const testConnection = async () => {
  if (!isDatabaseConfigured) {
    console.log('ℹ️ PostgreSQL is not configured. Runtime database sync will stay disabled in this environment.');
    return false;
  }

  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Close database connection
export const closeConnection = async () => {
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

export default db;
export { isDatabaseConfigured };
