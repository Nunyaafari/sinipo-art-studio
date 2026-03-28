import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { getMediaSettings } from './storefront.js';

dotenv.config();

const normalizeStorageMode = (value) =>
  value === 'cloudinary' ? 'cloudinary' : 'local';

const normalizeFolder = (value) =>
  typeof value === 'string' ? value.trim().replace(/^\/+|\/+$/g, '') : '';

const getEffectiveMediaSettings = () => {
  const settings = getMediaSettings();

  return {
    uploadStorage: normalizeStorageMode(settings?.uploadStorage || process.env.UPLOAD_STORAGE),
    backendPublicUrl:
      (settings?.backendPublicUrl || process.env.BACKEND_PUBLIC_URL || process.env.MEDIA_BASE_URL || '')
        .trim()
        .replace(/\/$/, ''),
    cloudinaryCloudName: settings?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: settings?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: settings?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || '',
    cloudinaryFolder: normalizeFolder(settings?.cloudinaryFolder || process.env.CLOUDINARY_FOLDER || 'sinipo-art')
  };
};

const resolveCloudinaryFolder = (baseFolder, optionFolder) => {
  const normalizedBaseFolder = normalizeFolder(baseFolder) || 'sinipo-art';
  const normalizedOptionFolder = normalizeFolder(optionFolder);

  if (!normalizedOptionFolder) {
    return normalizedBaseFolder;
  }

  if (
    normalizedOptionFolder === normalizedBaseFolder ||
    normalizedOptionFolder.startsWith(`${normalizedBaseFolder}/`)
  ) {
    return normalizedOptionFolder;
  }

  const optionSuffix = normalizedOptionFolder.replace(/^sinipo-art\/?/, '');
  return `${normalizedBaseFolder}/${optionSuffix}`;
};

const hasCloudinaryConfig = (settings = getEffectiveMediaSettings()) =>
  Boolean(
    settings.cloudinaryCloudName &&
    settings.cloudinaryApiKey &&
    settings.cloudinaryApiSecret
  );

export const getUploadStorageMode = () => {
  const settings = getEffectiveMediaSettings();
  const configuredMode = settings.uploadStorage;

  if (configuredMode === 'cloudinary' && hasCloudinaryConfig(settings)) {
    return 'cloudinary';
  }

  return 'local';
};

const getBackendPublicBaseUrl = () => {
  return getEffectiveMediaSettings().backendPublicUrl;
};

const toServedAssetUrl = (filePath) => {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadsRoot, filePath).split(path.sep).join('/');
  const publicPath = relativePath && !relativePath.startsWith('..')
    ? `/uploads/${relativePath}`
    : `/uploads/${path.basename(filePath)}`;
  const backendPublicBaseUrl = getBackendPublicBaseUrl();

  return backendPublicBaseUrl ? `${backendPublicBaseUrl}${publicPath}` : publicPath;
};

const configureCloudinary = (settings = getEffectiveMediaSettings()) => {
  if (!hasCloudinaryConfig(settings)) {
    return false;
  }

  cloudinary.config({
    cloud_name: settings.cloudinaryCloudName,
    api_key: settings.cloudinaryApiKey,
    api_secret: settings.cloudinaryApiSecret,
  });

  return true;
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = req.body.type || 'general';
    const uploadPath = path.join(uploadsDir, subfolder);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
  }
};

// Multer upload configuration
export const upload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Image optimization function
export const optimizeImage = async (inputPath, outputPath, options = {}) => {
  try {
    const {
      width = 1200,
      height = 1200,
      quality = 80,
      format = 'webp'
    } = options;

    let sharpInstance = sharp(inputPath);

    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to specified format with quality
    switch (format) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      default:
        sharpInstance = sharpInstance.webp({ quality });
    }

    // Save optimized image
    await sharpInstance.toFile(outputPath);

    // Get file info
    const stats = fs.statSync(outputPath);
    
    return {
      success: true,
      path: outputPath,
      size: stats.size,
      format: format
    };

  } catch (error) {
    console.error('Image optimization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const uploadToCloudinary = async (filePath, options = {}) => {
  const mediaSettings = getEffectiveMediaSettings();

  if (getUploadStorageMode() !== 'cloudinary') {
    return {
      success: true,
      url: toServedAssetUrl(filePath),
      public_id: null,
      width: null,
      height: null,
      format: path.extname(filePath).slice(1),
      bytes: fs.statSync(filePath).size,
      storage: 'local'
    };
  }

  if (!configureCloudinary(mediaSettings)) {
    return {
      success: false,
      error: 'Cloudinary storage is enabled, but credentials are incomplete.'
    };
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: resolveCloudinaryFolder(mediaSettings.cloudinaryFolder, options.folder),
      public_id: options.public_id,
      transformation: options.transformation,
      overwrite: true,
      resource_type: 'image'
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      storage: 'cloudinary'
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (public_id) => {
  const mediaSettings = getEffectiveMediaSettings();

  if (getUploadStorageMode() !== 'cloudinary' || !public_id) {
    return {
      success: true,
      skipped: true
    };
  }

  if (!configureCloudinary(mediaSettings)) {
    return {
      success: false,
      error: 'Cloudinary storage is enabled, but credentials are incomplete.'
    };
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate image variants
export const generateImageVariants = async (inputPath, baseName) => {
  try {
    const variants = [];
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 400, height: 400 },
      { name: 'medium', width: 800, height: 800 },
      { name: 'large', width: 1200, height: 1200 }
    ];

    for (const size of sizes) {
      const outputPath = path.join(
        path.dirname(inputPath),
        `${baseName}-${size.name}.webp`
      );

      const result = await optimizeImage(inputPath, outputPath, {
        width: size.width,
        height: size.height,
        quality: 80,
        format: 'webp'
      });

      if (result.success) {
        variants.push({
          size: size.name,
          path: outputPath,
          width: size.width,
          height: size.height,
          size_bytes: result.size
        });
      }
    }

    return {
      success: true,
      variants: variants
    };

  } catch (error) {
    console.error('Generate variants error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Clean up temporary files
export const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Cleanup error:', error);
    return false;
  }
};

// Get image metadata
export const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      success: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation
      }
    };
  } catch (error) {
    console.error('Get metadata error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { cloudinary };
