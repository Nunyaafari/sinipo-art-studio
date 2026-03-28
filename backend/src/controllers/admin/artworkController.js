import { getArtworksState, savePersistentState } from '../../storage/persistentState.js';
import { resolveMediaUrlsByIds, syncMediaAssetIdsForUrls } from '../../utils/mediaAssets.js';
import { recordAdminAudit } from '../../utils/adminAudit.js';
import {
  assertRequiredFields,
  createHttpError,
  normalizeString,
  parseNumberField
} from '../../utils/validation.js';

const buildSku = (product) => {
  if (typeof product?.sku === 'string' && product.sku.trim()) {
    return product.sku.trim();
  }

  return `SIN-${String(product?.id ?? '000').padStart(3, '0')}`;
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeVariantId = (variant, productId, index) => {
  if (typeof variant?.id === 'string' && variant.id.trim()) {
    return variant.id.trim();
  }

  return `${productId}-variant-${index + 1}`;
};

const normalizeProductVariants = (value, product = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const fallbackSku = buildSku(product);

  return value
    .map((variant, index) => {
      const parsedStockQuantity = Number.parseInt(variant?.stockQuantity ?? 0, 10);
      const stockQuantity = Number.isNaN(parsedStockQuantity) ? 0 : Math.max(0, parsedStockQuantity);
      const parsedPrice = Number.parseFloat(variant?.price);
      const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;

      return {
        id: normalizeVariantId(variant, product.id || 'product', index),
        sku:
          typeof variant?.sku === 'string' && variant.sku.trim()
            ? variant.sku.trim()
            : `${fallbackSku}-${index + 1}`,
        size:
          typeof variant?.size === 'string' && variant.size.trim()
            ? variant.size.trim()
            : product.clothingSize || product.size || '',
        color:
          typeof variant?.color === 'string' && variant.color.trim()
            ? variant.color.trim()
            : product.color || '',
        material:
          typeof variant?.material === 'string' && variant.material.trim()
            ? variant.material.trim()
            : product.material || '',
        stockQuantity,
        price,
        isDefault:
          variant?.isDefault === true ||
          variant?.isDefault === 'true' ||
          (index === 0 && !value.some((item) => item?.isDefault === true || item?.isDefault === 'true'))
      };
    })
    .filter((variant) => variant.size || variant.color || variant.stockQuantity > 0);
};

const normalizeArtworkImages = (...sources) => {
  const uniqueImages = [];
  const seen = new Set();

  const pushImage = (value) => {
    if (Array.isArray(value)) {
      value.forEach(pushImage);
      return;
    }

    if (typeof value !== 'string') {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    uniqueImages.push(trimmed);
  };

  sources.forEach(pushImage);

  return uniqueImages;
};

const normalizeArtworkRecord = (artwork) => {
  const images = normalizeArtworkImages(artwork.image, artwork.images);
  const productType = artwork.productType || 'artwork';
  const variants = productType === 'fashion' ? normalizeProductVariants(artwork.variants, artwork) : [];
  const fallbackStockQuantity = productType === 'artwork' ? 10 : 1;
  const parsedStockQuantity = Number.parseInt(artwork.stockQuantity ?? fallbackStockQuantity, 10);
  const stockQuantity = variants.length > 0
    ? variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
    : Number.isNaN(parsedStockQuantity)
      ? fallbackStockQuantity
      : Math.max(0, parsedStockQuantity);
  const inStock = artwork.inStock === false ? false : stockQuantity > 0;
  const defaultVariant =
    variants.find((variant) => variant.id === artwork.selectedVariantId)
    || variants.find((variant) => variant.isDefault)
    || variants[0]
    || null;
  const lowStockThreshold = Math.max(1, Number.parseInt(artwork.lowStockThreshold ?? 3, 10) || 3);

  return {
    ...artwork,
    productType,
    sku: buildSku(artwork),
    subcategory: artwork.subcategory || artwork.style,
    image: images[0] || artwork.image,
    images,
    variants,
    selectedVariantId: artwork.selectedVariantId || defaultVariant?.id || null,
    frameColor: artwork.frameColor || (productType === 'fashion' ? 'N/A' : 'Gold'),
    clothingSize: artwork.clothingSize || defaultVariant?.size || '',
    color: artwork.color || defaultVariant?.color || '',
    material: artwork.material || defaultVariant?.material || '',
    careInstructions: artwork.careInstructions || '',
    isPublished: artwork.isPublished !== false,
    inStock,
    stockQuantity,
    lowStockThreshold
  };
};

const parseNumber = (value, fieldName) => {
  return parseNumberField(value, fieldName, { min: 0.01 });
};

const parseInteger = (value, fieldName) => {
  return parseNumberField(value, fieldName, { integer: true, min: 0 });
};

const normalizeIntegerArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => !Number.isNaN(item));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => !Number.isNaN(item));
  }

  return [];
};

const artworks = getArtworksState();
export const getAdminArtworksData = () => artworks.map(normalizeArtworkRecord);

const validateArtworkRecord = (artwork) => {
  assertRequiredFields(artwork, [
    { key: 'title', label: 'title' },
    { key: 'artist', label: 'artist/brand' },
    { key: 'price', label: 'price' },
    { key: 'category', label: 'category' },
    { key: 'style', label: 'style' },
    { key: 'description', label: 'description' }
  ]);

  if (!Array.isArray(artwork.images) || artwork.images.length === 0) {
    throw createHttpError(400, 'At least one image is required');
  }

  if (artwork.productType === 'fashion') {
    if (!Array.isArray(artwork.variants) || artwork.variants.length === 0) {
      throw createHttpError(400, 'Add at least one fashion variant');
    }

    return;
  }

  assertRequiredFields(artwork, [
    { key: 'size', label: 'size' },
    { key: 'dimensions', label: 'dimensions' },
    { key: 'frameColor', label: 'frame color' }
  ]);
};

const respondWithArtworkError = (res, error, fallbackError) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? fallbackError : error.message,
    message: error.message
  });
};

// Get all artworks
export const getAllArtworks = async (req, res) => {
  try {
    const { category, style, size, isFeatured, isNew, isBestseller, search } = req.query;

    let filteredArtworks = getAdminArtworksData();

    if (category && category !== 'All') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.category === category);
    }
    if (style && style !== 'All Styles') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.style === style);
    }
    if (size && size !== 'All Sizes') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.size === size);
    }
    if (isFeatured === 'true') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.isFeatured);
    }
    if (isNew === 'true') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.isNew);
    }
    if (isBestseller === 'true') {
      filteredArtworks = filteredArtworks.filter((artwork) => artwork.isBestseller);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredArtworks = filteredArtworks.filter((artwork) =>
        artwork.title.toLowerCase().includes(searchLower) ||
        artwork.artist.toLowerCase().includes(searchLower) ||
        artwork.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: filteredArtworks,
      count: filteredArtworks.length
    });
  } catch (error) {
    console.error('Get all artworks error:', error);
    res.status(500).json({
      error: 'Failed to get artworks',
      message: error.message
    });
  }
};

// Get artwork by ID
export const getArtworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const artwork = artworks.find((item) => item.id === Number.parseInt(id, 10));

    if (!artwork) {
      return res.status(404).json({
        error: 'Artwork not found'
      });
    }

    res.json({
      success: true,
      data: normalizeArtworkRecord(artwork)
    });
  } catch (error) {
    console.error('Get artwork by ID error:', error);
    res.status(500).json({
      error: 'Failed to get artwork',
      message: error.message
    });
  }
};

// Create new artwork
export const createArtwork = async (req, res) => {
  try {
    const {
      productType = 'artwork',
      title,
      artist,
      price,
      originalPrice,
      category,
      subcategory,
      style,
      size,
      dimensions,
      clothingSize,
      color,
      material,
      sku,
      image,
      images,
      isNew,
      isFeatured,
      isBestseller,
      isPublished,
      inStock,
      stockQuantity,
      lowStockThreshold,
      frameColor,
      description,
      tags,
      careInstructions,
      variants
    } = req.body;
    const providedImageAssetIds = normalizeIntegerArray(req.body.imageAssetIds);
    const assetImageUrls = resolveMediaUrlsByIds(providedImageAssetIds);

    const normalizedImages = normalizeArtworkImages(assetImageUrls, image, images);
    const normalizedType = productType === 'fashion' ? 'fashion' : 'artwork';
    const normalizedSize = normalizedType === 'fashion' ? clothingSize || size : size;
    const normalizedDimensions =
      normalizedType === 'fashion' ? dimensions || `Size ${normalizedSize || ''}`.trim() : dimensions;
    const requiresArtworkFields = normalizedType === 'artwork';
    const normalizedStockQuantity =
      stockQuantity === undefined || stockQuantity === null || stockQuantity === ''
        ? 1
        : Math.max(0, parseInteger(stockQuantity, 'Stock quantity'));
    const normalizedVariants = normalizedType === 'fashion'
      ? normalizeProductVariants(variants, {
          id: artworks.length > 0 ? Math.max(...artworks.map((item) => item.id)) + 1 : 1,
          clothingSize,
          size,
          color,
          material,
          sku
        })
      : [];
    const effectiveStockQuantity = normalizedVariants.length > 0
      ? normalizedVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
      : normalizedStockQuantity;
    const normalizedInStock =
      (inStock === undefined ? true : inStock === true || inStock === 'true') &&
      effectiveStockQuantity > 0;

    const syncedImageAssetIds = syncMediaAssetIdsForUrls(normalizedImages, {
      type: normalizedType === 'fashion' ? 'general' : 'artwork',
      title,
      altText: title,
      source: 'product'
    });

    const draftArtwork = {
      id: artworks.length > 0 ? Math.max(...artworks.map((item) => item.id)) + 1 : 1,
      title: normalizeString(title),
      artist: normalizeString(artist),
      price: parseNumber(price, 'Price'),
      originalPrice:
        originalPrice === undefined || originalPrice === null || originalPrice === ''
          ? undefined
          : parseNumber(originalPrice, 'Original price'),
      productType: normalizedType,
      category: normalizeString(category),
      subcategory: normalizeString(subcategory || style),
      sku: typeof sku === 'string' && sku.trim() ? sku.trim() : undefined,
      style: normalizeString(style),
      size: normalizeString(normalizedSize),
      dimensions: normalizeString(normalizedDimensions),
      clothingSize: normalizedType === 'fashion' ? normalizeString(normalizedSize) : undefined,
      color: normalizedType === 'fashion' ? normalizeString(color) : undefined,
      material: normalizedType === 'fashion' ? normalizeString(material) : undefined,
      variants: normalizedVariants,
      selectedVariantId: normalizedVariants.find((variant) => variant.isDefault)?.id || normalizedVariants[0]?.id || null,
      image: normalizedImages[0],
      images: normalizedImages,
      imageAssetIds: syncedImageAssetIds,
      isNew: isNew === true || isNew === 'true',
      isFeatured: isFeatured === true || isFeatured === 'true',
      isBestseller: isBestseller === true || isBestseller === 'true',
      isPublished: isPublished === undefined ? true : isPublished === true || isPublished === 'true',
      inStock: normalizedInStock,
      stockQuantity: effectiveStockQuantity,
      lowStockThreshold:
        lowStockThreshold === undefined || lowStockThreshold === null || lowStockThreshold === ''
          ? 3
          : Math.max(1, parseInteger(lowStockThreshold, 'Low stock threshold')),
      frameColor: normalizedType === 'fashion' ? 'N/A' : normalizeString(frameColor),
      description: normalizeString(description),
      tags: normalizeStringArray(tags),
      careInstructions: normalizedType === 'fashion' ? normalizeString(careInstructions) : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    validateArtworkRecord(draftArtwork);
    const newArtwork = normalizeArtworkRecord(draftArtwork);

    artworks.push(newArtwork);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'artwork.create',
      targetType: 'artwork',
      targetId: newArtwork.id,
      summary: `Created ${newArtwork.productType} product "${newArtwork.title}"`,
      changes: {
        title: newArtwork.title,
        productType: newArtwork.productType,
        price: newArtwork.price,
        isPublished: newArtwork.isPublished,
        stockQuantity: newArtwork.stockQuantity
      }
    });

    res.status(201).json({
      success: true,
      data: newArtwork,
      message: 'Artwork created successfully'
    });
  } catch (error) {
    console.error('Create artwork error:', error);
    respondWithArtworkError(res, error, 'Failed to create artwork');
  }
};

// Update artwork
export const updateArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const artworkIndex = artworks.findIndex((item) => item.id === Number.parseInt(id, 10));

    if (artworkIndex === -1) {
      return res.status(404).json({
        error: 'Artwork not found'
      });
    }

    const currentArtwork = normalizeArtworkRecord(artworks[artworkIndex]);
    const updateData = req.body;
    const providedImageAssetIds = normalizeIntegerArray(updateData.imageAssetIds);
    const assetImageUrls = resolveMediaUrlsByIds(providedImageAssetIds);
    const normalizedImages =
      updateData.image !== undefined || updateData.images !== undefined
        ? normalizeArtworkImages(assetImageUrls, updateData.image ?? currentArtwork.image, updateData.images)
        : currentArtwork.images;
    const normalizedType =
      updateData.productType === 'fashion' || currentArtwork.productType === 'fashion'
        ? (updateData.productType === 'artwork' ? 'artwork' : 'fashion')
        : 'artwork';
    const normalizedVariants = normalizedType === 'fashion'
      ? normalizeProductVariants(
          updateData.variants !== undefined ? updateData.variants : currentArtwork.variants,
          {
            ...currentArtwork,
            ...updateData,
            id: Number.parseInt(id, 10)
          }
        )
      : [];

    if (!normalizedImages.length) {
      throw createHttpError(400, 'At least one image is required');
    }

    const syncedImageAssetIds = syncMediaAssetIdsForUrls(normalizedImages, {
      type: normalizedType === 'fashion' ? 'general' : 'artwork',
      title: updateData.title || currentArtwork.title,
      altText: updateData.title || currentArtwork.title,
      source: 'product'
    });

    const updatedArtwork = normalizeArtworkRecord({
      ...currentArtwork,
      ...updateData,
      id: Number.parseInt(id, 10),
      productType: normalizedType,
      subcategory: updateData.subcategory || updateData.style || currentArtwork.subcategory,
      image: normalizedImages[0],
      images: normalizedImages,
      imageAssetIds: syncedImageAssetIds,
      sku:
        typeof updateData.sku === 'string' && updateData.sku.trim()
          ? updateData.sku.trim()
          : currentArtwork.sku,
      variants: normalizedVariants,
      selectedVariantId:
        normalizedVariants.find((variant) => variant.id === updateData.selectedVariantId)
          ? updateData.selectedVariantId
          : normalizedVariants.find((variant) => variant.isDefault)?.id || normalizedVariants[0]?.id || null,
      size:
        normalizedType === 'fashion'
          ? updateData.clothingSize || updateData.size || currentArtwork.clothingSize || currentArtwork.size
          : updateData.size || currentArtwork.size,
      dimensions:
        normalizedType === 'fashion'
          ? updateData.dimensions ||
            currentArtwork.dimensions ||
            `Size ${updateData.clothingSize || currentArtwork.clothingSize || currentArtwork.size}`
          : updateData.dimensions || currentArtwork.dimensions,
      clothingSize:
        normalizedType === 'fashion'
          ? updateData.clothingSize || updateData.size || currentArtwork.clothingSize || currentArtwork.size
          : undefined,
      frameColor: normalizedType === 'fashion' ? 'N/A' : updateData.frameColor || currentArtwork.frameColor,
      color: normalizedType === 'fashion' ? updateData.color || currentArtwork.color : undefined,
      material: normalizedType === 'fashion' ? updateData.material || currentArtwork.material : undefined,
      careInstructions:
        normalizedType === 'fashion'
          ? updateData.careInstructions || currentArtwork.careInstructions
          : undefined,
      tags:
        updateData.tags !== undefined ? normalizeStringArray(updateData.tags) : currentArtwork.tags,
      updatedAt: new Date().toISOString()
    });

    if (updateData.price !== undefined && updateData.price !== '') {
      updatedArtwork.price = parseNumber(updateData.price, 'Price');
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'originalPrice')) {
      updatedArtwork.originalPrice =
        updateData.originalPrice === undefined ||
        updateData.originalPrice === null ||
        updateData.originalPrice === ''
          ? undefined
          : parseNumber(updateData.originalPrice, 'Original price');
    }

    if (updateData.isNew !== undefined) {
      updatedArtwork.isNew = updateData.isNew === true || updateData.isNew === 'true';
    }
    if (updateData.isFeatured !== undefined) {
      updatedArtwork.isFeatured = updateData.isFeatured === true || updateData.isFeatured === 'true';
    }
    if (updateData.isBestseller !== undefined) {
      updatedArtwork.isBestseller =
        updateData.isBestseller === true || updateData.isBestseller === 'true';
    }
    if (updateData.isPublished !== undefined) {
      updatedArtwork.isPublished =
        updateData.isPublished === true || updateData.isPublished === 'true';
    }
    if (updateData.stockQuantity !== undefined && updateData.stockQuantity !== '') {
      updatedArtwork.stockQuantity = Math.max(0, parseInteger(updateData.stockQuantity, 'Stock quantity'));
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'lowStockThreshold')) {
      updatedArtwork.lowStockThreshold = Math.max(
        1,
        parseInteger(updateData.lowStockThreshold || currentArtwork.lowStockThreshold || 3, 'Low stock threshold')
      );
    }
    if (updateData.inStock !== undefined) {
      updatedArtwork.inStock = updateData.inStock === true || updateData.inStock === 'true';
    }

    if (normalizedVariants.length > 0) {
      updatedArtwork.stockQuantity = normalizedVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
      const currentVariant =
        normalizedVariants.find((variant) => variant.id === updatedArtwork.selectedVariantId)
        || normalizedVariants.find((variant) => variant.isDefault)
        || normalizedVariants[0];
      if (currentVariant) {
        updatedArtwork.clothingSize = currentVariant.size;
        updatedArtwork.color = currentVariant.color;
        updatedArtwork.material = currentVariant.material || updatedArtwork.material;
      }
    }

    updatedArtwork.inStock = updatedArtwork.inStock && updatedArtwork.stockQuantity > 0;
    validateArtworkRecord(updatedArtwork);

    artworks[artworkIndex] = updatedArtwork;
    savePersistentState();
    recordAdminAudit(req, {
      action: 'artwork.update',
      targetType: 'artwork',
      targetId: updatedArtwork.id,
      summary: `Updated ${updatedArtwork.productType} product "${updatedArtwork.title}"`,
      changes: {
        before: {
          title: currentArtwork.title,
          price: currentArtwork.price,
          stockQuantity: currentArtwork.stockQuantity,
          isPublished: currentArtwork.isPublished
        },
        after: {
          title: updatedArtwork.title,
          price: updatedArtwork.price,
          stockQuantity: updatedArtwork.stockQuantity,
          isPublished: updatedArtwork.isPublished
        }
      }
    });

    res.json({
      success: true,
      data: updatedArtwork,
      message: 'Artwork updated successfully'
    });
  } catch (error) {
    console.error('Update artwork error:', error);
    respondWithArtworkError(res, error, 'Failed to update artwork');
  }
};

// Delete artwork
export const deleteArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const artworkIndex = artworks.findIndex((item) => item.id === Number.parseInt(id, 10));

    if (artworkIndex === -1) {
      return res.status(404).json({
        error: 'Artwork not found'
      });
    }

    const deletedArtwork = artworks[artworkIndex];
    artworks.splice(artworkIndex, 1);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'artwork.delete',
      targetType: 'artwork',
      targetId: deletedArtwork.id,
      summary: `Deleted ${deletedArtwork.productType || 'artwork'} product "${deletedArtwork.title}"`,
      metadata: {
        title: deletedArtwork.title,
        sku: deletedArtwork.sku,
        stockQuantity: deletedArtwork.stockQuantity
      }
    });

    res.json({
      success: true,
      data: deletedArtwork,
      message: 'Artwork deleted successfully'
    });
  } catch (error) {
    console.error('Delete artwork error:', error);
    res.status(500).json({
      error: 'Failed to delete artwork',
      message: error.message
    });
  }
};

// Get artwork statistics
export const getArtworkStats = async (req, res) => {
  try {
    const normalizedArtworks = getAdminArtworksData();
    const stats = {
      total: normalizedArtworks.length,
      published: normalizedArtworks.filter((artwork) => artwork.isPublished !== false).length,
      drafts: normalizedArtworks.filter((artwork) => artwork.isPublished === false).length,
      featured: normalizedArtworks.filter((artwork) => artwork.isFeatured).length,
      newArrivals: normalizedArtworks.filter((artwork) => artwork.isNew).length,
      bestsellers: normalizedArtworks.filter((artwork) => artwork.isBestseller).length,
      lowStock: normalizedArtworks.filter(
        (artwork) => artwork.inStock !== false && artwork.stockQuantity <= artwork.lowStockThreshold
      ).length,
      categories: [...new Set(normalizedArtworks.map((artwork) => artwork.category))],
      styles: [...new Set(normalizedArtworks.map((artwork) => artwork.style))],
      priceRange: {
        min: normalizedArtworks.length ? Math.min(...normalizedArtworks.map((artwork) => artwork.price)) : 0,
        max: normalizedArtworks.length ? Math.max(...normalizedArtworks.map((artwork) => artwork.price)) : 0
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get artwork stats error:', error);
    res.status(500).json({
      error: 'Failed to get artwork statistics',
      message: error.message
    });
  }
};
