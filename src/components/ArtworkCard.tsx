import { useState } from "react";
import type { Product } from "../data/products";
import { assetUrl } from "../lib/api";

interface ArtworkCardProps {
  artwork: Product;
  onAddToCart: (artwork: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (artwork: Product) => void;
}

const frameStyles: Record<string, string> = {
  Gold: "shadow-[6px_6px_0_#c8a830,7px_7px_0_#a8881c]",
  Black: "shadow-[6px_6px_0_#1a1a1a,7px_7px_0_#000]",
  White: "shadow-[6px_6px_0_#e8e8e8,7px_7px_0_#ccc]",
  Silver: "shadow-[6px_6px_0_#b0b0b0,7px_7px_0_#888]",
  Walnut: "shadow-[6px_6px_0_#5c3d2e,7px_7px_0_#3d2518]",
};

const frameBorder: Record<string, string> = {
  Gold: "border-[#c8a830]",
  Black: "border-[#1a1a1a]",
  White: "border-[#ccc]",
  Silver: "border-[#b0b0b0]",
  Walnut: "border-[#5c3d2e]",
};

export default function ArtworkCard({ artwork, onAddToCart, onViewDetail }: ArtworkCardProps) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const lowStockThreshold = artwork.lowStockThreshold ?? 3;
  const stockQuantity = Math.max(artwork.stockQuantity ?? 0, 0);
  const isInStock = artwork.inStock !== false && stockQuantity > 0;
  const stockLabel = !isInStock ? "OUT OF STOCK" : stockQuantity <= lowStockThreshold ? `ONLY ${stockQuantity} LEFT` : "IN STOCK";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isInStock) {
      return;
    }

    if (artwork.productType === "fashion" && Array.isArray(artwork.variants) && artwork.variants.length > 0) {
      onViewDetail(artwork);
      return;
    }

    onAddToCart(artwork);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  // Determine if this is an artwork or fashion item
  const isArtwork = artwork.productType === "artwork";
  const frameColor = artwork.frameColor || "Gold"; // Default frame for artworks

  return (
    <div
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onViewDetail(artwork)}
    >
      {/* Frame + Image Container */}
      <div className={`relative border-8 ${frameBorder[frameColor]} ${frameStyles[frameColor]} transition-transform duration-500 ${hovered ? "-translate-y-1" : ""}`}>
        {/* Inner mat */}
        <div className="border-4 border-white/60 overflow-hidden">
          <div className="relative overflow-hidden aspect-[4/5]">
            <img
              src={assetUrl(artwork.image)}
              alt={artwork.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${hovered ? "scale-110" : "scale-100"}`}
            />
            {/* Overlay on hover */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}>
              <button
                className="border border-white/80 text-white px-6 py-2 text-xs tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-200"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                QUICK VIEW
              </button>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {artwork.isNew && (
            <span
              className="bg-[#c8a830] text-white text-[9px] tracking-[0.15em] px-2 py-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              NEW
            </span>
          )}
          {artwork.isBestseller && (
            <span
              className="bg-[#0a0a0a] text-white text-[9px] tracking-[0.15em] px-2 py-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              BESTSELLER
            </span>
          )}
          {artwork.originalPrice && (
            <span
              className="bg-red-600 text-white text-[9px] tracking-[0.15em] px-2 py-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              SALE
            </span>
          )}
          {/* Product type badge */}
          <span
            className={`text-[9px] tracking-[0.15em] px-2 py-1 ${
              isArtwork ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
            }`}
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {isArtwork ? "ART" : "FASHION"}
          </span>
        </div>

        {/* Wishlist */}
        <button
          onClick={handleLike}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:bg-white ${liked ? "text-red-500" : "text-gray-400"}`}
        >
          <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 px-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3
              className="text-[#0a0a0a] text-base font-light leading-tight group-hover:text-[#c8a830] transition-colors duration-200"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {artwork.title}
            </h3>
            <p
              className="text-gray-500 text-xs mt-0.5 tracking-wider"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {artwork.artist}
            </p>
          </div>
          <div className="text-right shrink-0">
            {artwork.originalPrice && (
              <div
                className="text-gray-400 text-xs line-through"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                ${artwork.originalPrice}
              </div>
            )}
            <div
              className="text-[#0a0a0a] text-base font-medium"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              ${artwork.price.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {isArtwork ? (
              <>
                <span
                  className="text-gray-400 text-[10px] tracking-wider"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {artwork.dimensions}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span
                  className="text-gray-400 text-[10px] tracking-wider"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {artwork.frameColor} Frame
                </span>
              </>
            ) : (
              <>
                {artwork.clothingSize && (
                  <>
                    <span
                      className="text-gray-400 text-[10px] tracking-wider"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {Array.isArray(artwork.variants) && artwork.variants.length > 0
                        ? `${artwork.variants.length} variants`
                        : `Size: ${artwork.clothingSize}`}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                  </>
                )}
                {artwork.color && (
                  <span
                    className="text-gray-400 text-[10px] tracking-wider"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {artwork.color}
                  </span>
                )}
                {artwork.material && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span
                      className="text-gray-400 text-[10px] tracking-wider"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {artwork.material}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <p
          className={`mt-3 text-[10px] tracking-[0.2em] ${
            isInStock ? "text-emerald-700" : "text-red-500"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {stockLabel}
        </p>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={!isInStock}
          className={`w-full mt-3 py-2.5 text-xs tracking-[0.15em] transition-all duration-300 ${
            !isInStock
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : addedToCart
              ? "bg-green-700 text-white"
              : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {!isInStock
            ? "OUT OF STOCK"
            : artwork.productType === "fashion" && Array.isArray(artwork.variants) && artwork.variants.length > 0
              ? "SELECT OPTIONS"
              : addedToCart
                ? "✓ ADDED TO CART"
                : "ADD TO CART"}
        </button>
      </div>
    </div>
  );
}
