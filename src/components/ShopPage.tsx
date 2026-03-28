import { useState, useMemo, useEffect } from "react";
import { 
  products as fallbackProducts, 
  allCategories, 
  allStyles, 
  sizeOptions, 
  sortOptions, 
  artCategories,
  fashionCategories,
  clothingSizes,
  fashionColors,
  fashionMaterials,
  type Product 
} from "../data/products";
import ArtworkCard from "./ArtworkCard";
import ArtworkDetail from "./ArtworkDetail";
import { apiUrl } from "../lib/api";

interface ShopPageProps {
  onAddToCart: (product: Product, quantity?: number, selectedFrame?: string) => void;
}

export default function ShopPage({ onAddToCart }: ShopPageProps) {
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeStyle, setActiveStyle] = useState("All Styles");
  const [activeSize, setActiveSize] = useState("All Sizes");
  const [activeProductType, setActiveProductType] = useState<"all" | "artwork" | "fashion">("all");
  const [sortBy, setSortBy] = useState("Featured");
  const [priceRange, setPriceRange] = useState([0, 1500]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Fashion-specific filters
  const [activeColor, setActiveColor] = useState("All Colors");
  const [activeMaterial, setActiveMaterial] = useState("All Materials");
  const [activeClothingSize, setActiveClothingSize] = useState("All Sizes");

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const response = await fetch(apiUrl("/api/shopping/products"));
        const data = await response.json();

        if (!cancelled && response.ok && data.success && Array.isArray(data.data)) {
          setCatalog(data.data);
        }
      } catch (error) {
        console.error("Failed to load live catalog:", error);
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const matchesFashionSize = (product: Product, size: string) => {
    if (product.productType !== "fashion") {
      return product.size === size;
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.some((variant) => variant.size === size);
    }

    return product.clothingSize === size || product.size === size;
  };

  const matchesFashionColor = (product: Product, color: string) => {
    if (product.productType !== "fashion") {
      return product.color === color;
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.some((variant) => variant.color === color);
    }

    return product.color === color;
  };

  const filtered = useMemo(() => {
    let result = [...catalog];

    // Filter by product type
    if (activeProductType !== "all") {
      result = result.filter((p) => p.productType === activeProductType);
    }

    // Filter by category
    if (activeCategory !== "All") {
      result = result.filter((p) => p.category === activeCategory);
    }

    // Filter by style
    if (activeStyle !== "All Styles") {
      result = result.filter((p) => p.style === activeStyle);
    }

    // Filter by size (for artworks) or clothing size (for fashion)
    if (activeSize !== "All Sizes") {
      result = result.filter((p) => matchesFashionSize(p, activeSize));
    }

    // Fashion-specific filters
    if (activeColor !== "All Colors") {
      result = result.filter((p) => matchesFashionColor(p, activeColor));
    }

    if (activeMaterial !== "All Materials") {
      result = result.filter((p) => p.material === activeMaterial);
    }

    // Price filter
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    switch (sortBy) {
      case "Newest":
        result = result.filter((p) => p.isNew).concat(result.filter((p) => !p.isNew));
        break;
      case "Price: Low to High":
        result.sort((a, b) => a.price - b.price);
        break;
      case "Price: High to Low":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Bestsellers":
        result = result.filter((p) => p.isBestseller).concat(result.filter((p) => !p.isBestseller));
        break;
      case "Name: A-Z":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "Name: Z-A":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        result = result.filter((p) => p.isFeatured).concat(result.filter((p) => !p.isFeatured));
    }

    return result;
  }, [catalog, activeProductType, activeCategory, activeStyle, activeSize, activeColor, activeMaterial, sortBy, priceRange]);

  if (selectedProduct) {
    return (
      <ArtworkDetail
        artwork={selectedProduct}
        onBack={() => setSelectedProduct(null)}
        onAddToCart={onAddToCart}
        onViewDetail={setSelectedProduct}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Page header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          SINIPO ART STUDIO
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          The Collection
        </h1>
        <p
          className="text-white/50 mt-3 text-sm tracking-wider font-light max-w-lg mx-auto"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {filtered.length} artworks · All framed and ready to hang
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Filter bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200">
          {/* Product Type Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveProductType("all")}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                activeProductType === "all"
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              ALL PRODUCTS
            </button>
            <button
              onClick={() => setActiveProductType("artwork")}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                activeProductType === "artwork"
                  ? "bg-[#c8a830] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              🎨 ARTWORK
            </button>
            <button
              onClick={() => setActiveProductType("fashion")}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                activeProductType === "fashion"
                  ? "bg-[#c8a830] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              👗 FASHION
            </button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                activeCategory === "All"
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              ALL CATEGORIES
            </button>
            {activeProductType === "artwork" && artCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
            {activeProductType === "fashion" && fashionCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
            {activeProductType === "all" && allCategories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Filter toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 border border-gray-200 px-4 py-2 hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              FILTER
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs tracking-[0.1em] text-gray-600 border border-gray-200 px-4 py-2 bg-white hover:border-gray-400 transition-colors outline-none cursor-pointer"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced filters */}
        {filterOpen && (
          <div className="bg-white border border-gray-100 p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>STYLE</label>
              <div className="flex flex-wrap gap-2">
                {allStyles.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveStyle(s)}
                    className={`px-3 py-1.5 text-xs tracking-wide transition-all ${
                      activeStyle === s ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {activeProductType === "fashion" ? "CLOTHING SIZE" : "SIZE"}
              </label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={`px-3 py-1.5 text-xs tracking-wide transition-all ${
                      activeSize === s ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Fashion-specific filters */}
            {activeProductType === "fashion" && (
              <>
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>COLOR</label>
                  <div className="flex flex-wrap gap-2">
                    {["All Colors", ...fashionColors].map((c) => (
                      <button
                        key={c}
                        onClick={() => setActiveColor(c)}
                        className={`px-3 py-1.5 text-xs tracking-wide transition-all ${
                          activeColor === c ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>MATERIAL</label>
                  <div className="flex flex-wrap gap-2">
                    {["All Materials", ...fashionMaterials].map((m) => (
                      <button
                        key={m}
                        onClick={() => setActiveMaterial(m)}
                        className={`px-3 py-1.5 text-xs tracking-wide transition-all ${
                          activeMaterial === m ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                PRICE: ${priceRange[0]} – ${priceRange[1]}
              </label>
              <input
                type="range"
                min={0}
                max={1500}
                step={50}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                className="w-full accent-[#c8a830]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <span>$0</span>
                <span>$1,500+</span>
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              No products match your filters
            </p>
            <button
              onClick={() => { 
                setActiveCategory("All"); 
                setActiveStyle("All Styles"); 
                setActiveSize("All Sizes");
                setActiveProductType("all");
                setActiveColor("All Colors");
                setActiveMaterial("All Materials");
              }}
              className="mt-4 text-sm text-[#c8a830] underline"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-14">
            {filtered.map((product) => (
              <ArtworkCard
                key={product.id}
                artwork={product}
                onAddToCart={onAddToCart}
                onViewDetail={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
