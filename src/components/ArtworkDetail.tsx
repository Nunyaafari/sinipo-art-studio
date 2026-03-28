import React, { useEffect, useMemo, useState } from "react";
import type { Product } from "../data/products";
import SocialShare from "./SocialShare";
import FollowButton from "./FollowButton";
import ProductRecommendations from "./ProductRecommendations";
import RecentlyViewed from "./RecentlyViewed";
import { apiUrl, assetUrl } from "../lib/api";
import { useWishlist } from "../contexts/WishlistContext";

interface ArtworkDetailProps {
  artwork: Product;
  onBack: () => void;
  onAddToCart: (artwork: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (artwork: Product) => void;
}

const frameBorderStyles: Record<string, string> = {
  Gold: "border-[#c8a830]",
  Black: "border-[#1a1a1a]",
  White: "border-[#ccc]",
  Silver: "border-[#b0b0b0]",
  Walnut: "border-[#5c3d2e]",
};

const frameNames: Record<string, string> = {
  Gold: "#c8a830",
  Black: "#1a1a1a",
  Silver: "#b0b0b0",
  White: "#e0e0e0",
  Walnut: "#5c3d2e",
};

export default function ArtworkDetail({ artwork, onBack, onAddToCart, onViewDetail }: ArtworkDetailProps): JSX.Element {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const galleryImages = useMemo(
    () => Array.from(new Set([artwork.image, ...(artwork.images || [])].filter(Boolean))),
    [artwork.image, artwork.images]
  );
  const isArtwork = artwork.productType === "artwork";
  const variants = useMemo(() => (Array.isArray(artwork.variants) ? artwork.variants : []), [artwork.variants]);
  const availableSizes = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean))),
    [variants]
  );
  const [selectedFashionSize, setSelectedFashionSize] = useState(
    artwork.clothingSize || availableSizes[0] || ""
  );
  const availableColors = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .filter((variant) => !selectedFashionSize || variant.size === selectedFashionSize)
            .map((variant) => variant.color)
            .filter(Boolean)
        )
      ),
    [selectedFashionSize, variants]
  );
  const [selectedFashionColor, setSelectedFashionColor] = useState(
    artwork.color || availableColors[0] || ""
  );
  const selectedVariant = useMemo(() => {
    if (!variants.length) {
      return null;
    }

    return (
      variants.find(
        (variant) =>
          (!selectedFashionSize || variant.size === selectedFashionSize) &&
          (!selectedFashionColor || variant.color === selectedFashionColor)
      ) ||
      variants.find((variant) => variant.id === artwork.selectedVariantId) ||
      variants.find((variant) => variant.isDefault) ||
      variants[0]
    );
  }, [artwork.selectedVariantId, selectedFashionColor, selectedFashionSize, variants]);
  const stockQuantity = Math.max(
    isArtwork ? artwork.stockQuantity ?? 0 : selectedVariant?.stockQuantity ?? artwork.stockQuantity ?? 0,
    0
  );
  const lowStockThreshold = artwork.lowStockThreshold ?? 3;
  const isInStock = artwork.inStock !== false && stockQuantity > 0;
  const stockLabel = !isInStock ? "Out of stock" : stockQuantity <= lowStockThreshold ? `Only ${stockQuantity} left` : "In stock";
  const [selectedFrame, setSelectedFrame] = useState(artwork.frameColor || "Gold");
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] || artwork.image);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);

  const frames = ["Gold", "Black", "Silver", "White", "Walnut"];
  const displaySku = isArtwork ? artwork.sku : selectedVariant?.sku || artwork.sku;
  const liked = isWishlisted(artwork.id);

  const handleAddToCart = () => {
    if (!isInStock) {
      return;
    }

    const productForCart =
      !isArtwork && selectedVariant
        ? {
            ...artwork,
            selectedVariantId: selectedVariant.id,
            clothingSize: selectedVariant.size,
            color: selectedVariant.color,
            material: selectedVariant.material || artwork.material,
            sku: selectedVariant.sku || artwork.sku,
            price: selectedVariant.price ?? artwork.price,
            stockQuantity: selectedVariant.stockQuantity,
            inStock: selectedVariant.stockQuantity > 0,
          }
        : artwork;

    onAddToCart(productForCart, quantity, isArtwork ? selectedFrame : undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlistToggle = async () => {
    if (wishlistPending) {
      return;
    }

    setWishlistPending(true);
    await toggleWishlist(artwork.id);
    setWishlistPending(false);
  };

  useEffect(() => {
    setSelectedFrame(artwork.frameColor || "Gold");
    setSelectedImage(galleryImages[0] || artwork.image);
    setIsZoomed(false);
    setQuantity(1);
    setSelectedFashionSize(artwork.clothingSize || availableSizes[0] || "");
    setSelectedFashionColor(artwork.color || availableColors[0] || "");
  }, [artwork.id, artwork.frameColor, artwork.image, artwork.clothingSize, artwork.color, availableColors, availableSizes, galleryImages]);

  useEffect(() => {
    if (!variants.length) {
      return;
    }

    if (selectedFashionSize && !variants.some((variant) => variant.size === selectedFashionSize)) {
      setSelectedFashionSize(variants[0]?.size || "");
    }
  }, [selectedFashionSize, variants]);

  useEffect(() => {
    if (!availableColors.length) {
      return;
    }

    if (!selectedFashionColor || !availableColors.includes(selectedFashionColor)) {
      setSelectedFashionColor(availableColors[0]);
    }
  }, [availableColors, selectedFashionColor]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    void fetch(apiUrl("/api/shopping/track-view"), {
      method: "POST",
      headers,
      body: JSON.stringify({ productId: artwork.id }),
    }).catch((error) => {
      console.error("Failed to track product view:", error);
    });
  }, [artwork.id]);

  const handleZoomMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setZoomPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-24">
      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6">
        <div className="flex items-center gap-2 text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <button onClick={onBack} className="hover:text-[#c8a830] transition-colors tracking-wider">
            COLLECTION
          </button>
          <span>/</span>
          <span className="text-gray-600">{artwork.title}</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left - Artwork */}
          <div className="flex items-start justify-center">
            <div className="relative max-w-2xl w-full">
              <div className="flex flex-col-reverse md:flex-row gap-4 items-start">
                <div className="flex md:flex-col gap-3 md:sticky md:top-28 w-full md:w-auto overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                  {galleryImages.map((image, index) => {
                    const isSelected = selectedImage === image;

                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        className={`shrink-0 w-16 h-16 md:w-18 md:h-18 border bg-white overflow-hidden transition-all ${
                          isSelected
                            ? "border-[#c8a830] shadow-[0_0_0_1px_#c8a830]"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        title={`${artwork.title} view ${index + 1}`}
                      >
                        <img
                          src={assetUrl(image)}
                          alt={`${artwork.title} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 w-full">
              {/* Wall mockup */}
                  <div
                    className="relative p-8 rounded-sm"
                    style={{ background: "linear-gradient(135deg, #f5f0eb 0%, #ede8e3 100%)" }}
                  >
                    <div className={`border-[14px] ${frameBorderStyles[selectedFrame]} shadow-2xl`}>
                      <div className="border-4 border-white/70">
                        <div
                          className="relative overflow-hidden bg-white"
                          onMouseEnter={() => setIsZoomed(true)}
                          onMouseLeave={() => setIsZoomed(false)}
                          onMouseMove={handleZoomMove}
                        >
                          <img
                            src={assetUrl(selectedImage)}
                            alt={artwork.title}
                            className={`w-full aspect-[4/5] object-cover transition-transform duration-150 ${
                              isZoomed ? "scale-[1.9] cursor-zoom-in" : "scale-100"
                            }`}
                            style={{
                              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                            }}
                          />
                          {isZoomed && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-[10px] tracking-[0.2em] text-white/85">
                              MOVE CURSOR TO ZOOM
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Frame selector - only for artworks */}
              {isArtwork && (
                <div className="mt-6">
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    FRAME: <span className="text-gray-700">{selectedFrame}</span>
                  </p>
                  <div className="flex gap-3">
                    {frames.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFrame(f)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                          selectedFrame === f ? "scale-110 border-[#c8a830]" : "border-gray-200 hover:border-gray-400"
                        }`}
                        style={{ backgroundColor: frameNames[f] }}
                        title={f}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Details */}
          <div className="flex flex-col justify-start">
            {/* Badges */}
            <div className="flex gap-2 mb-4">
              {artwork.isNew && (
                <span className="bg-[#c8a830] text-white text-[9px] tracking-[0.2em] px-3 py-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  NEW ARRIVAL
                </span>
              )}
              {artwork.isBestseller && (
                <span className="bg-[#0a0a0a] text-white text-[9px] tracking-[0.2em] px-3 py-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  BESTSELLER
                </span>
              )}
              {/* Product type badge */}
              <span
                className={`text-[9px] tracking-[0.2em] px-3 py-1 ${
                  isArtwork ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {isArtwork ? "ARTWORK" : "FASHION"}
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-5xl font-light text-[#0a0a0a] leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {artwork.title}
            </h1>

            {/* Artist */}
            <p
              className="text-[#c8a830] text-sm tracking-[0.2em] mt-2"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              by {artwork.artist}
            </p>

            {/* Price */}
            <div className="flex items-center gap-4 mt-6">
              <span
                className="text-4xl text-[#0a0a0a] font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                ${artwork.price.toLocaleString()}
              </span>
              {artwork.originalPrice && (
                <span className="text-xl text-gray-400 line-through" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  ${artwork.originalPrice}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 text-[10px] tracking-[0.24em] ${
                  isInStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {stockLabel.toUpperCase()}
              </span>
              {isInStock && (
                <span
                  className="text-xs tracking-[0.16em] text-gray-400"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  READY TO SHIP
                </span>
              )}
              {displaySku && (
                <span
                  className="text-xs tracking-[0.16em] text-gray-400"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  SKU: {displaySku}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="w-12 h-px bg-[#c8a830] my-6" />

            {/* Description */}
            <p
              className="text-gray-600 leading-relaxed font-light text-lg"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {artwork.description}
            </p>

            {!isArtwork && variants.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p
                    className="text-xs tracking-[0.2em] text-gray-400 mb-3"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    SIZE
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedFashionSize(size)}
                        className={`border px-4 py-2 text-xs tracking-[0.16em] transition-colors ${
                          selectedFashionSize === size
                            ? "border-[#c8a830] bg-[#fff8df] text-[#0a0a0a]"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p
                    className="text-xs tracking-[0.2em] text-gray-400 mb-3"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    COLOR
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedFashionColor(color)}
                        className={`border px-4 py-2 text-xs tracking-[0.16em] transition-colors ${
                          selectedFashionColor === color
                            ? "border-[#c8a830] bg-[#fff8df] text-[#0a0a0a]"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Details grid */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {isArtwork ? (
                // Artwork details
                [
                  { label: "Dimensions", value: artwork.dimensions },
                  { label: "Style", value: artwork.style },
                  { label: "Category", value: artwork.category },
                  { label: "Frame", value: `${selectedFrame} hardwood` },
                  { label: "Medium", value: "Giclée fine art print" },
                  { label: "Paper", value: "300gsm archival" },
                ].map((detail) => (
                  <div key={detail.label} className="border-b border-gray-100 pb-3">
                    <dt
                      className="text-[10px] tracking-[0.2em] text-gray-400 mb-1"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {detail.label.toUpperCase()}
                    </dt>
                    <dd
                      className="text-gray-700 text-sm"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px" }}
                    >
                      {detail.value}
                    </dd>
                  </div>
                ))
              ) : (
                // Fashion details
                [
                  { label: "Size", value: selectedVariant?.size || artwork.clothingSize || artwork.size },
                  { label: "Color", value: selectedVariant?.color || artwork.color || "N/A" },
                  { label: "Material", value: selectedVariant?.material || artwork.material || "N/A" },
                  { label: "Category", value: artwork.category },
                  { label: "Style", value: artwork.style || "N/A" },
                  { label: "SKU", value: displaySku || "N/A" },
                  { label: "Care", value: artwork.careInstructions || "See label" },
                ].map((detail) => (
                  <div key={detail.label} className="border-b border-gray-100 pb-3">
                    <dt
                      className="text-[10px] tracking-[0.2em] text-gray-400 mb-1"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {detail.label.toUpperCase()}
                    </dt>
                    <dd
                      className="text-gray-700 text-sm"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px" }}
                    >
                      {detail.value}
                    </dd>
                  </div>
                ))
              )}
            </div>

            {/* Quantity + Add to cart */}
            <div className="mt-8 flex gap-3">
              <div className="flex items-center border border-gray-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!isInStock}
                  className="w-10 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))}
                  disabled={!isInStock || quantity >= stockQuantity}
                  className="w-10 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!isInStock}
                className={`flex-1 py-3 text-sm tracking-[0.2em] font-medium transition-all duration-300 ${
                  !isInStock
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : added
                      ? "bg-green-700 text-white"
                      : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {!isInStock ? "OUT OF STOCK" : added ? "✓ ADDED TO CART" : "ADD TO CART"}
              </button>
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={wishlistPending}
                className={`w-12 h-12 border border-gray-200 flex items-center justify-center transition-colors ${
                  liked ? "text-red-500 border-red-200" : "text-gray-500 hover:border-gray-400 hover:text-red-400"
                } disabled:cursor-wait`}
                aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                title={liked ? "Remove from wishlist" : "Add to wishlist"}
              >
                <svg className="w-5 h-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>

            {/* Social Features */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  SHARE & CONNECT
                </h3>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 text-xs text-[#c8a830] hover:underline"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  SHARE
                </button>
              </div>
              
              {/* Follow Artist */}
              <div className="flex items-center justify-between p-4 bg-gray-50 mb-4">
                <div>
                  <p className="text-sm text-gray-700" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Follow {artwork.artist}
                  </p>
                  <p className="text-xs text-gray-400">Get updates on new artworks</p>
                </div>
                <FollowButton 
                  targetUserId={artwork.id} // Using artwork ID as proxy for artist ID
                  targetUserName={artwork.artist}
                  size="sm"
                  variant="outline"
                />
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 border-t border-gray-100 pt-6 grid grid-cols-3 gap-4">
              {[
                { icon: "🚚", text: "Free Shipping", sub: "Worldwide" },
                { icon: "🎨", text: "Certificate", sub: "of Authenticity" },
                { icon: "↩️", text: "30-day", sub: "Returns" },
              ].map((badge) => (
                <div key={badge.text} className="text-center">
                  <div className="text-xl mb-1">{badge.icon}</div>
                  <div className="text-xs font-medium text-gray-700" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {badge.text}
                  </div>
                  <div className="text-[10px] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {badge.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 space-y-6">
          <ProductRecommendations
            currentProductId={artwork.id}
            title={isArtwork ? "Related Works" : "You May Also Like"}
            limit={4}
            onAddToCart={onAddToCart}
            onViewDetail={onViewDetail}
          />
          <RecentlyViewed
            limit={4}
            onAddToCart={onAddToCart}
            onViewDetail={onViewDetail}
          />
        </div>
      </div>

      {/* Social Share Modal */}
      {showShareModal && (
        <SocialShare
          productId={artwork.id}
          productTitle={artwork.title}
          productImage={artwork.image}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
