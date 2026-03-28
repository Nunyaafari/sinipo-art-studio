import { getFashionCatalogProducts } from '../data/products.js';
import {
  getArtworksState,
  getInventoryMovementsState,
  savePersistentState
} from '../storage/persistentState.js';
import { getInventorySettings } from '../config/storefront.js';

const artworks = getArtworksState();
const inventoryMovements = getInventoryMovementsState();

const normalizeImageList = (...sources) => {
  const seen = new Set();
  const images = [];

  sources.flat().forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    images.push(trimmed);
  });

  return images;
};

const buildProductSku = (product) => {
  if (typeof product?.sku === 'string' && product.sku.trim()) {
    return product.sku.trim();
  }

  return `SIN-${String(product?.id ?? '000').padStart(3, '0')}`;
};

const normalizeVariantId = (variant, productId, index) => {
  if (typeof variant?.id === 'string' && variant.id.trim()) {
    return variant.id.trim();
  }

  return `${productId}-variant-${index + 1}`;
};

const normalizeProductVariants = (product) => {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return [];
  }

  const fallbackSku = buildProductSku(product);

  return product.variants.map((variant, index) => {
    const parsedStockQuantity = Number.parseInt(variant?.stockQuantity ?? 0, 10);
    const stockQuantity = Number.isNaN(parsedStockQuantity) ? 0 : Math.max(0, parsedStockQuantity);
    const parsedPrice = Number.parseFloat(variant?.price);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;

    return {
      id: normalizeVariantId(variant, product.id, index),
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
        (index === 0 && !product.variants.some((item) => item?.isDefault === true || item?.isDefault === 'true'))
    };
  });
};

const normalizeCatalogProduct = (product) => {
  const images = normalizeImageList(product.image, product.images);
  const productType = product.productType || 'artwork';
  const lowStockThresholdSetting = Math.max(1, Number.parseInt(getInventorySettings().lowStockThreshold ?? 3, 10) || 3);
  const variants = productType === 'fashion' ? normalizeProductVariants(product) : [];
  const defaultVariant =
    variants.find((variant) => variant.id === product.selectedVariantId)
    || variants.find((variant) => variant.isDefault)
    || variants[0]
    || null;
  const fallbackStockQuantity = productType === 'artwork' ? 10 : 1;
  const parsedBaseStockQuantity = Number.parseInt(product.stockQuantity ?? fallbackStockQuantity, 10);
  const stockQuantity = variants.length > 0
    ? variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
    : Number.isNaN(parsedBaseStockQuantity)
      ? fallbackStockQuantity
      : Math.max(parsedBaseStockQuantity, 0);
  const lowStockThreshold = Math.max(
    1,
    Number.parseInt(product.lowStockThreshold ?? lowStockThresholdSetting, 10) || lowStockThresholdSetting
  );

  return {
    ...product,
    productType,
    sku: buildProductSku(product),
    subcategory: product.subcategory || product.style,
    image: images[0] || product.image,
    images,
    variants,
    selectedVariantId: product.selectedVariantId || defaultVariant?.id || null,
    isPublished: product.isPublished !== false,
    frameColor: product.frameColor || (productType === 'fashion' ? 'N/A' : 'Gold'),
    clothingSize: product.clothingSize || defaultVariant?.size || '',
    color: product.color || defaultVariant?.color || '',
    material: product.material || defaultVariant?.material || '',
    price: defaultVariant?.price ?? product.price,
    inStock: product.inStock === false ? false : stockQuantity > 0,
    stockQuantity,
    lowStockThreshold
  };
};

const logInventoryMovement = ({
  product,
  variant,
  quantityDelta,
  previousQuantity,
  nextQuantity,
  reason = 'manual_adjustment',
  reference = null
}) => {
  inventoryMovements.push({
    id: `move_${Date.now()}_${inventoryMovements.length + 1}`,
    productId: product.id,
    productTitle: product.title,
    productType: product.productType,
    sku: variant?.sku || product.sku || buildProductSku(product),
    variantId: variant?.id || null,
    variantLabel: variant ? `${variant.size}${variant.color ? ` / ${variant.color}` : ''}` : null,
    quantityDelta,
    previousQuantity,
    nextQuantity,
    reason,
    reference,
    createdAt: new Date().toISOString()
  });
};

export const getCatalogProductsData = () => {
  const artworkProducts = artworks.map((artwork) => normalizeCatalogProduct(artwork));
  const fashionProducts = getFashionCatalogProducts().map((product) => normalizeCatalogProduct(product));

  return [...artworkProducts, ...fashionProducts];
};

export const findCatalogProductById = (productId) => {
  const numericId = Number.parseInt(productId, 10);
  if (Number.isNaN(numericId)) {
    return null;
  }

  return getCatalogProductsData().find((product) => product.id === numericId) || null;
};

const findMutableCatalogProduct = (productId) => {
  const numericId = Number.parseInt(productId, 10);

  if (Number.isNaN(numericId)) {
    return null;
  }

  return artworks.find((product) => product.id === numericId)
    || getFashionCatalogProducts().find((product) => product.id === numericId)
    || null;
};

export const getLowStockCatalogProducts = () =>
  getCatalogProductsData().filter((product) => product.inStock !== false && product.stockQuantity <= product.lowStockThreshold);

export const getInventoryMovementData = () => inventoryMovements;

export const adjustCatalogInventory = (productId, quantityDelta, options = {}) => {
  const mutableProduct = findMutableCatalogProduct(productId);

  if (!mutableProduct) {
    throw new Error(`Product ${productId} was not found`);
  }

  const currentProduct = normalizeCatalogProduct(mutableProduct);
  const timestamp = new Date().toISOString();

  if (options.variantId && Array.isArray(mutableProduct.variants) && mutableProduct.variants.length > 0) {
    const variantIndex = mutableProduct.variants.findIndex((variant, index) => {
      const variantId = normalizeVariantId(variant, currentProduct.id, index);
      return variantId === options.variantId;
    });

    if (variantIndex === -1) {
      throw new Error(`Variant ${options.variantId} was not found for ${currentProduct.title}`);
    }

    const normalizedVariants = normalizeProductVariants(mutableProduct);
    const currentVariant = normalizedVariants[variantIndex];
    const nextVariantQuantity = currentVariant.stockQuantity + quantityDelta;

    if (nextVariantQuantity < 0) {
      throw new Error(`${currentProduct.title} does not have enough stock available`);
    }

    mutableProduct.variants[variantIndex] = {
      ...mutableProduct.variants[variantIndex],
      id: currentVariant.id,
      sku: currentVariant.sku,
      size: currentVariant.size,
      color: currentVariant.color,
      material: currentVariant.material,
      price: currentVariant.price,
      isDefault: currentVariant.isDefault,
      stockQuantity: nextVariantQuantity
    };
    mutableProduct.stockQuantity = normalizeProductVariants(mutableProduct).reduce(
      (sum, variant) => sum + variant.stockQuantity,
      0
    );
    mutableProduct.inStock = mutableProduct.stockQuantity > 0;
    mutableProduct.updatedAt = timestamp;

    logInventoryMovement({
      product: currentProduct,
      variant: currentVariant,
      quantityDelta,
      previousQuantity: currentVariant.stockQuantity,
      nextQuantity: nextVariantQuantity,
      reason: options.reason,
      reference: options.reference || null
    });
  } else {
    const nextQuantity = currentProduct.stockQuantity + quantityDelta;

    if (nextQuantity < 0) {
      throw new Error(`${currentProduct.title} does not have enough stock available`);
    }

    mutableProduct.stockQuantity = nextQuantity;
    mutableProduct.inStock = nextQuantity > 0;
    mutableProduct.updatedAt = timestamp;

    logInventoryMovement({
      product: currentProduct,
      variant: null,
      quantityDelta,
      previousQuantity: currentProduct.stockQuantity,
      nextQuantity,
      reason: options.reason,
      reference: options.reference || null
    });
  }

  if (!mutableProduct.frameColor) {
    mutableProduct.frameColor = mutableProduct.productType === 'fashion' ? 'N/A' : 'Gold';
  }

  if (options.persist !== false) {
    savePersistentState();
  }

  return normalizeCatalogProduct(mutableProduct);
};

export const applyInventoryAdjustmentToOrder = (order, mode = 'deduct', options = {}) => {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      order,
      inventoryChanged: false
    };
  }

  const quantityMultiplier = mode === 'restore' ? 1 : -1;
  let inventoryChanged = false;

  const updatedItems = order.items.map((item) => {
    const productId = item?.artwork?.id ?? item?.productId;
    const quantity = Number.parseInt(item?.quantity ?? 1, 10);
    const variantId = item?.artwork?.selectedVariantId || item?.selectedVariantId || null;

    if (!productId || Number.isNaN(quantity) || quantity < 1) {
      return item;
    }

    const updatedProduct = adjustCatalogInventory(productId, quantityMultiplier * quantity, {
      persist: false,
      variantId,
      reason: options.reason || (mode === 'restore' ? 'order_restore' : 'order_allocation'),
      reference: options.reference || order.reference || null
    });

    inventoryChanged = true;

    if (!item?.artwork) {
      return item;
    }

    const updatedVariant = variantId
      ? updatedProduct.variants?.find((variant) => variant.id === variantId) || null
      : null;

    return {
      ...item,
      artwork: {
        ...item.artwork,
        stockQuantity: updatedVariant?.stockQuantity ?? updatedProduct.stockQuantity,
        inStock: updatedVariant ? updatedVariant.stockQuantity > 0 : updatedProduct.inStock
      }
    };
  });

  if (inventoryChanged) {
    savePersistentState();
  }

  return {
    order: {
      ...order,
      items: updatedItems
    },
    inventoryChanged
  };
};
