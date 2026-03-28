import { 
  upload, 
  optimizeImage, 
  uploadToCloudinary, 
  deleteFromCloudinary,
  generateImageVariants,
  cleanupTempFile,
  getImageMetadata
} from '../config/upload.js';
import { registerMediaAsset } from '../utils/mediaAssets.js';
import path from 'path';
import fs from 'fs';

const getServedAssetUrl = (result) =>
  result?.cloudinary?.url || result?.optimized?.path || result?.original?.path || null;

const getServedAssetPath = (result) =>
  result?.optimized?.path || result?.original?.path || null;

const createMediaAssetFromUpload = async ({ result, file, type, title }) => {
  const url = getServedAssetUrl(result);
  if (!url) {
    return null;
  }

  const metadataPath = getServedAssetPath(result);
  const metadataResult = metadataPath ? await getImageMetadata(metadataPath) : { success: false };

  return registerMediaAsset({
    url,
    type,
    title: title || file.originalname,
    altText: title || file.originalname,
    mimeType: file.mimetype,
    size: result?.cloudinary?.bytes || result?.optimized?.size || file.size,
    width: metadataResult.success ? metadataResult.metadata.width : null,
    height: metadataResult.success ? metadataResult.metadata.height : null,
    publicId: result?.cloudinary?.public_id || null,
    storageType: url.startsWith('/uploads/') ? 'local' : 'cloudinary',
    source: 'upload'
  });
};

// Single file upload
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const { type = 'general', optimize = 'true', cloudinary: useCloudinary = 'false' } = req.body;
    const filePath = req.file.path;
    const fileName = path.basename(filePath, path.extname(filePath));

    let result = {
      original: {
        filename: req.file.filename,
        path: filePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    };

    // Optimize image if requested
    if (optimize === 'true') {
      const optimizedPath = path.join(
        path.dirname(filePath),
        `${fileName}-optimized.webp`
      );

      const optimizationResult = await optimizeImage(filePath, optimizedPath, {
        width: 1200,
        height: 1200,
        quality: 80,
        format: 'webp'
      });

      if (optimizationResult.success) {
        result.optimized = {
          path: optimizationResult.path,
          size: optimizationResult.size,
          format: optimizationResult.format
        };
      }
    }

    // Upload to Cloudinary if requested
    if (useCloudinary === 'true') {
      const fileToUpload = result.optimized?.path || filePath;
      const cloudinaryResult = await uploadToCloudinary(fileToUpload, {
        folder: `sinipo-art/${type}`,
        public_id: fileName
      });

      if (cloudinaryResult.success) {
        result.cloudinary = {
          url: cloudinaryResult.url,
          public_id: cloudinaryResult.public_id,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          format: cloudinaryResult.format,
          bytes: cloudinaryResult.bytes
        };

        // Keep the returned asset on disk for local serving and only remove the unused original.
        if (result.optimized?.path) {
          cleanupTempFile(filePath);
        }
      }
    }

    result.mediaAsset = await createMediaAssetFromUpload({
      result,
      file: req.file,
      type,
      title: req.file.originalname
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: result
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
};

// Multiple files upload
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded'
      });
    }

    const { type = 'general', optimize = 'true', cloudinary: useCloudinary = 'false' } = req.body;
    const results = [];

    for (const file of req.files) {
      const filePath = file.path;
      const fileName = path.basename(filePath, path.extname(filePath));

      let result = {
        original: {
          filename: file.filename,
          path: filePath,
          size: file.size,
          mimetype: file.mimetype
        }
      };

      // Optimize image if requested
      if (optimize === 'true') {
        const optimizedPath = path.join(
          path.dirname(filePath),
          `${fileName}-optimized.webp`
        );

        const optimizationResult = await optimizeImage(filePath, optimizedPath, {
          width: 1200,
          height: 1200,
          quality: 80,
          format: 'webp'
        });

        if (optimizationResult.success) {
          result.optimized = {
            path: optimizationResult.path,
            size: optimizationResult.size,
            format: optimizationResult.format
          };
        }
      }

      // Upload to Cloudinary if requested
      if (useCloudinary === 'true') {
        const fileToUpload = result.optimized?.path || filePath;
        const cloudinaryResult = await uploadToCloudinary(fileToUpload, {
          folder: `sinipo-art/${type}`,
          public_id: fileName
        });

        if (cloudinaryResult.success) {
          result.cloudinary = {
            url: cloudinaryResult.url,
            public_id: cloudinaryResult.public_id,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            format: cloudinaryResult.format,
            bytes: cloudinaryResult.bytes
          };

          // Keep the returned asset on disk for local serving and only remove the unused original.
          if (result.optimized?.path) {
            cleanupTempFile(filePath);
          }
        }
      }

      result.mediaAsset = await createMediaAssetFromUpload({
        result,
        file,
        type,
        title: file.originalname
      });

      results.push(result);
    }

    res.json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (file.path) {
          cleanupTempFile(file.path);
        }
      });
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
};

// Upload artwork image
export const uploadArtworkImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No artwork image uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = path.basename(filePath, path.extname(filePath));

    // Generate multiple variants for artworks
    const variantsResult = await generateImageVariants(filePath, fileName);

    if (!variantsResult.success) {
      throw new Error('Failed to generate image variants');
    }

    // Upload all variants to Cloudinary
    const cloudinaryResults = [];
    for (const variant of variantsResult.variants) {
      const cloudinaryResult = await uploadToCloudinary(variant.path, {
        folder: 'sinipo-art/artworks',
        public_id: `${fileName}-${variant.size}`,
        transformation: [
          { width: variant.width, height: variant.height, crop: 'fill' }
        ]
      });

      if (cloudinaryResult.success) {
        cloudinaryResults.push({
          size: variant.size,
          url: cloudinaryResult.url,
          public_id: cloudinaryResult.public_id,
          width: variant.width,
          height: variant.height
        });
      }
    }

    // Remove only the temporary original; keep generated variants for local serving.
    cleanupTempFile(filePath);

    res.json({
      success: true,
      message: 'Artwork image uploaded successfully',
      data: {
        variants: cloudinaryResults,
        original_filename: req.file.originalname
      }
    });

  } catch (error) {
    console.error('Artwork upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }

    res.status(500).json({
      error: 'Artwork upload failed',
      message: error.message
    });
  }
};

// Upload user avatar
export const uploadUserAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No avatar image uploaded'
      });
    }

    const userId = req.user.userId;
    const filePath = req.file.path;
    const fileName = `avatar-${userId}-${Date.now()}`;

    // Optimize for avatar (square, smaller size)
    const optimizedPath = path.join(
      path.dirname(filePath),
      `${fileName}-avatar.webp`
    );

    const optimizationResult = await optimizeImage(filePath, optimizedPath, {
      width: 300,
      height: 300,
      quality: 85,
      format: 'webp'
    });

    if (!optimizationResult.success) {
      throw new Error('Failed to optimize avatar');
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(optimizedPath, {
      folder: 'sinipo-art/avatars',
      public_id: fileName,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' }
      ]
    });

    if (!cloudinaryResult.success) {
      throw new Error('Failed to upload avatar to Cloudinary');
    }

    // Remove only the temporary original; the optimized file is the served asset.
    cleanupTempFile(filePath);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        mediaAsset: await createMediaAssetFromUpload({
          result: {
            cloudinary: cloudinaryResult,
            optimized: {
              path: optimizedPath,
              size: optimizationResult.size
            }
          },
          file: req.file,
          type: 'avatar',
          title: req.file.originalname
        })
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }

    res.status(500).json({
      error: 'Avatar upload failed',
      message: error.message
    });
  }
};

// Upload blog featured image
export const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No blog image uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = path.basename(filePath, path.extname(filePath));

    // Optimize for blog (wider format)
    const optimizedPath = path.join(
      path.dirname(filePath),
      `${fileName}-blog.webp`
    );

    const optimizationResult = await optimizeImage(filePath, optimizedPath, {
      width: 1200,
      height: 630, // 1.91:1 aspect ratio for social sharing
      quality: 85,
      format: 'webp'
    });

    if (!optimizationResult.success) {
      throw new Error('Failed to optimize blog image');
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(optimizedPath, {
      folder: 'sinipo-art/blog',
      public_id: fileName,
      transformation: [
        { width: 1200, height: 630, crop: 'fill' }
      ]
    });

    if (!cloudinaryResult.success) {
      throw new Error('Failed to upload blog image to Cloudinary');
    }

    // Remove only the temporary original; the optimized file is the served asset.
    cleanupTempFile(filePath);

    res.json({
      success: true,
      message: 'Blog image uploaded successfully',
      data: {
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        mediaAsset: await createMediaAssetFromUpload({
          result: {
            cloudinary: cloudinaryResult,
            optimized: {
              path: optimizedPath,
              size: optimizationResult.size
            }
          },
          file: req.file,
          type: 'blog',
          title: req.file.originalname
        })
      }
    });

  } catch (error) {
    console.error('Blog image upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }

    res.status(500).json({
      error: 'Blog image upload failed',
      message: error.message
    });
  }
};

// Delete uploaded file
export const deleteUploadedFile = async (req, res) => {
  try {
    const { public_id, local_path } = req.body;

    if (!public_id && !local_path) {
      return res.status(400).json({
        error: 'No file identifier provided'
      });
    }

    const results = {};

    // Delete from Cloudinary if public_id provided
    if (public_id) {
      const cloudinaryResult = await deleteFromCloudinary(public_id);
      results.cloudinary = cloudinaryResult;
    }

    // Delete local file if path provided
    if (local_path) {
      const localResult = cleanupTempFile(local_path);
      results.local = { success: localResult };
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: results
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
};

// Get file info
export const getFileInfo = async (req, res) => {
  try {
    const { file_path } = req.params;

    if (!file_path) {
      return res.status(400).json({
        error: 'File path is required'
      });
    }

    const fullPath = path.join(process.cwd(), 'uploads', file_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    const metadataResult = await getImageMetadata(fullPath);

    if (!metadataResult.success) {
      throw new Error('Failed to get file metadata');
    }

    const stats = fs.statSync(fullPath);

    res.json({
      success: true,
      data: {
        path: file_path,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        metadata: metadataResult.metadata
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      error: 'Failed to get file info',
      message: error.message
    });
  }
};
