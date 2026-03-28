import {
  deleteMediaAsset,
  getMediaAssetById,
  getMediaAssetsWithUsage,
  updateMediaAsset
} from '../../utils/mediaAssets.js';
import { recordAdminAudit } from '../../utils/adminAudit.js';

export const getMediaAssets = async (req, res) => {
  try {
    const { type, search } = req.query;
    let assets = getMediaAssetsWithUsage();

    if (type && type !== 'all') {
      assets = assets.filter((asset) => asset.type === type);
    }

    if (search) {
      const query = String(search).trim().toLowerCase();
      assets = assets.filter((asset) =>
        asset.url.toLowerCase().includes(query) ||
        asset.title.toLowerCase().includes(query) ||
        asset.altText.toLowerCase().includes(query)
      );
    }

    res.json({
      success: true,
      data: assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Get media assets error:', error);
    res.status(500).json({
      error: 'Failed to get media assets',
      message: error.message
    });
  }
};

export const getMediaAsset = async (req, res) => {
  try {
    const asset = getMediaAssetById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        error: 'Media asset not found'
      });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Get media asset error:', error);
    res.status(500).json({
      error: 'Failed to get media asset',
      message: error.message
    });
  }
};

export const patchMediaAsset = async (req, res) => {
  try {
    const existingAsset = getMediaAssetById(req.params.id);
    const previousAsset = existingAsset
      ? {
          title: existingAsset.title,
          altText: existingAsset.altText,
          type: existingAsset.type
        }
      : null;
    const updatedAsset = updateMediaAsset(req.params.id, req.body);
    recordAdminAudit(req, {
      action: 'media.update',
      targetType: 'mediaAsset',
      targetId: updatedAsset.id,
      summary: `Updated media asset #${updatedAsset.id}`,
      changes: {
        before: previousAsset,
        after: {
          title: updatedAsset.title,
          altText: updatedAsset.altText,
          type: updatedAsset.type
        }
      }
    });

    res.json({
      success: true,
      data: updatedAsset,
      message: 'Media asset updated successfully'
    });
  } catch (error) {
    console.error('Update media asset error:', error);
    const statusCode = error.message === 'Media asset not found' ? 404 : 400;
    res.status(statusCode).json({
      error: error.message || 'Failed to update media asset'
    });
  }
};

export const removeMediaAsset = async (req, res) => {
  try {
    const existingAsset = getMediaAssetById(req.params.id);
    const deletedAsset = await deleteMediaAsset(req.params.id);
    recordAdminAudit(req, {
      action: 'media.delete',
      targetType: 'mediaAsset',
      targetId: deletedAsset.id,
      summary: `Deleted media asset #${deletedAsset.id}`,
      metadata: {
        url: existingAsset?.url || deletedAsset.url,
        type: existingAsset?.type || deletedAsset.type
      }
    });

    res.json({
      success: true,
      data: deletedAsset,
      message: 'Media asset deleted successfully'
    });
  } catch (error) {
    console.error('Delete media asset error:', error);
    const statusCode = error.message === 'Media asset not found' ? 404 : 400;
    res.status(statusCode).json({
      error: error.message || 'Failed to delete media asset'
    });
  }
};
