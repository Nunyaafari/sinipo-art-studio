import fs from 'fs';
import path from 'path';
import {
  getArtworksState,
  getBlogPostsState,
  getMediaAssetsState,
  savePersistentState
} from '../storage/persistentState.js';

const mediaAssets = getMediaAssetsState();

const normalizeUrl = (value) => (typeof value === 'string' ? value.trim() : '');

const inferStorageType = (url) => {
  if (url.startsWith('/uploads/')) {
    return 'local';
  }

  if (url.includes('res.cloudinary.com')) {
    return 'cloudinary';
  }

  return 'remote';
};

const getNextAssetId = () => Math.max(...mediaAssets.map((asset) => asset.id), 0) + 1;

const sanitizeType = (type) => {
  if (type === 'artwork' || type === 'blog' || type === 'avatar') {
    return type;
  }

  return 'general';
};

export const getMediaAssetById = (id) => {
  const numericId = Number.parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return null;
  }

  return mediaAssets.find((asset) => asset.id === numericId) || null;
};

export const getMediaAssetByUrl = (url) => {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  return mediaAssets.find((asset) => asset.url === normalizedUrl) || null;
};

export const registerMediaAsset = (input, options = {}) => {
  const {
    persist = true
  } = options;

  const normalizedUrl = normalizeUrl(input?.url);
  if (!normalizedUrl) {
    return null;
  }

  const existingAsset = getMediaAssetByUrl(normalizedUrl);
  if (existingAsset) {
    let didUpdate = false;

    if (input?.type && existingAsset.type !== sanitizeType(input.type)) {
      existingAsset.type = sanitizeType(input.type);
      didUpdate = true;
    }
    if (input?.title && !existingAsset.title) {
      existingAsset.title = input.title;
      didUpdate = true;
    }
    if (input?.altText && !existingAsset.altText) {
      existingAsset.altText = input.altText;
      didUpdate = true;
    }
    if (input?.mimeType && !existingAsset.mimeType) {
      existingAsset.mimeType = input.mimeType;
      didUpdate = true;
    }
    if (input?.size && !existingAsset.size) {
      existingAsset.size = input.size;
      didUpdate = true;
    }
    if (input?.width && !existingAsset.width) {
      existingAsset.width = input.width;
      didUpdate = true;
    }
    if (input?.height && !existingAsset.height) {
      existingAsset.height = input.height;
      didUpdate = true;
    }
    if (input?.publicId && !existingAsset.publicId) {
      existingAsset.publicId = input.publicId;
      didUpdate = true;
    }
    if (input?.source && !existingAsset.source) {
      existingAsset.source = input.source;
      didUpdate = true;
    }

    if (didUpdate) {
      existingAsset.updatedAt = new Date().toISOString();
      if (persist) {
        savePersistentState();
      }
    }

    return existingAsset;
  }

  const asset = {
    id: getNextAssetId(),
    url: normalizedUrl,
    type: sanitizeType(input?.type),
    title: input?.title || '',
    altText: input?.altText || input?.title || '',
    mimeType: input?.mimeType || '',
    size: input?.size ?? null,
    width: input?.width ?? null,
    height: input?.height ?? null,
    storageType: input?.storageType || inferStorageType(normalizedUrl),
    publicId: input?.publicId || null,
    source: input?.source || 'upload',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mediaAssets.push(asset);

  if (persist) {
    savePersistentState();
  }

  return asset;
};

export const resolveMediaAssetsByIds = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids
    .map((id) => getMediaAssetById(id))
    .filter(Boolean);
};

export const resolveMediaUrlsByIds = (ids) =>
  resolveMediaAssetsByIds(ids).map((asset) => asset.url);

export const syncMediaAssetIdsForUrls = (urls, options = {}) => {
  if (!Array.isArray(urls)) {
    return [];
  }

  const seenIds = new Set();
  const assetIds = [];

  urls.forEach((url) => {
    const asset = registerMediaAsset({
      url,
      type: options.type,
      title: options.title,
      altText: options.altText,
      source: options.source || 'content'
    }, { persist: false });

    if (asset && !seenIds.has(asset.id)) {
      seenIds.add(asset.id);
      assetIds.push(asset.id);
    }
  });

  savePersistentState();
  return assetIds;
};

const collectArtworkUrls = (artwork) => {
  const urls = [];

  if (typeof artwork?.image === 'string') {
    urls.push(artwork.image);
  }

  if (Array.isArray(artwork?.images)) {
    artwork.images.forEach((url) => urls.push(url));
  }

  return urls.map(normalizeUrl).filter(Boolean);
};

const collectBlogUrls = (post) => {
  const url = normalizeUrl(post?.featuredImage);
  return url ? [url] : [];
};

export const hydrateMediaAssetsFromContent = () => {
  let changed = false;

  getArtworksState().forEach((artwork) => {
    const urls = collectArtworkUrls(artwork);
    urls.forEach((url) => {
      const asset = registerMediaAsset({
        url,
        type: artwork?.productType === 'fashion' ? 'general' : 'artwork',
        title: artwork?.title || '',
        altText: artwork?.title || '',
        source: 'content-sync'
      }, { persist: false });

      if (asset) {
        changed = true;
      }
    });
  });

  getBlogPostsState().forEach((post) => {
    collectBlogUrls(post).forEach((url) => {
      const asset = registerMediaAsset({
        url,
        type: 'blog',
        title: post?.title || '',
        altText: post?.title || '',
        source: 'content-sync'
      }, { persist: false });

      if (asset) {
        changed = true;
      }
    });
  });

  if (changed) {
    savePersistentState();
  }
};

const getMediaUsageByUrl = (url) => {
  const artworkUsage = getArtworksState().filter((artwork) =>
    collectArtworkUrls(artwork).includes(url)
  );
  const blogUsage = getBlogPostsState().filter((post) =>
    collectBlogUrls(post).includes(url)
  );

  return {
    artworks: artworkUsage.map((artwork) => ({
      id: artwork.id,
      title: artwork.title
    })),
    blogPosts: blogUsage.map((post) => ({
      id: post.id,
      title: post.title
    }))
  };
};

export const getMediaAssetsWithUsage = () => {
  hydrateMediaAssetsFromContent();

  return [...mediaAssets]
    .map((asset) => {
      const usage = getMediaUsageByUrl(asset.url);
      return {
        ...asset,
        usage,
        usageCount: usage.artworks.length + usage.blogPosts.length
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

const localPathFromAssetUrl = (url) => {
  if (!url.startsWith('/uploads/')) {
    return null;
  }

  return path.join(process.cwd(), url.replace(/^\//, ''));
};

export const deleteMediaAsset = (id) => {
  const assetIndex = mediaAssets.findIndex((asset) => asset.id === Number.parseInt(id, 10));
  if (assetIndex === -1) {
    throw new Error('Media asset not found');
  }

  const asset = mediaAssets[assetIndex];
  const usage = getMediaUsageByUrl(asset.url);
  if (usage.artworks.length > 0 || usage.blogPosts.length > 0) {
    throw new Error('This media asset is still in use and cannot be deleted');
  }

  const localPath = localPathFromAssetUrl(asset.url);
  if (localPath && fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }

  const [deletedAsset] = mediaAssets.splice(assetIndex, 1);
  savePersistentState();
  return deletedAsset;
};

export const updateMediaAsset = (id, updates) => {
  const asset = getMediaAssetById(id);
  if (!asset) {
    throw new Error('Media asset not found');
  }

  asset.title = typeof updates?.title === 'string' ? updates.title.trim() : asset.title;
  asset.altText = typeof updates?.altText === 'string' ? updates.altText.trim() : asset.altText;
  asset.type = updates?.type ? sanitizeType(updates.type) : asset.type;
  asset.updatedAt = new Date().toISOString();
  savePersistentState();
  return asset;
};

hydrateMediaAssetsFromContent();
