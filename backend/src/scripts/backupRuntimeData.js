import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getStorageFilePath } from '../storage/persistentState.js';
import { getUploadStorageMode } from '../config/upload.js';

dotenv.config();

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.resolve(process.cwd(), process.env.BACKUP_DIR || 'backups');
const backupDir = path.join(backupRoot, timestamp);
const uploadsDir = path.join(process.cwd(), process.env.UPLOAD_LOCAL_PATH || 'uploads');
const storageFile = getStorageFilePath();

fs.mkdirSync(backupDir, { recursive: true });

if (fs.existsSync(storageFile)) {
  fs.copyFileSync(storageFile, path.join(backupDir, path.basename(storageFile)));
}

if (getUploadStorageMode() === 'local' && fs.existsSync(uploadsDir)) {
  fs.cpSync(uploadsDir, path.join(backupDir, 'uploads'), { recursive: true });
}

const manifest = {
  createdAt: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  uploadStorage: getUploadStorageMode(),
  storageFile: path.basename(storageFile),
  includesUploads: getUploadStorageMode() === 'local' && fs.existsSync(uploadsDir),
  notes: [
    'This backup captures the file-backed persistent runtime state.',
    'If Postgres is enabled for runtime sync, also configure managed database snapshots or pg_dump backups externally.',
    'If UPLOAD_STORAGE=cloudinary, media binaries are stored remotely and should be backed up via your Cloudinary account policies.'
  ]
};

fs.writeFileSync(
  path.join(backupDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`Backup created at ${backupDir}`);
