import { useState, useEffect } from "react";
import type { Product } from "../data/products";
import { allCategories, allStyles, clothingSizes, fashionColors, fashionMaterials } from "../data/products";
import ArtworkCard from "./ArtworkCard";

interface AdvancedSearchProps {
  onAddToCart: (product: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (product: Product) => void;
}

export default function AdvancedSearch({ onAddToCart, onViewDetail }: AdvancedSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "All",
    style: "All Styles",
    size: "All Sizes",
    color: "All Colors",
    material: "All Materials",
    minPrice: "",
    maxPrice: "",
    productType: "all"
  });
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  const API_BASE = 'http://localhost:3001/api/shopping';

  useEffect(() => {
    fetchTrendingSearches();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const fetchTrendingSearches = async () => {
    try {
      const response = await fetch(`${API_BASE}/search/trending?limit=5`);
      const data = await response.json();
      if (data.success) {
        setTrendingSearches(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trending searches:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('query', searchQuery);
      if (filters.category !== 'All') params.append('category', filters.category);
      if (filters.style !== 'All Styles') params.append('style', filters.style);
      if (filters.size !== 'All Sizes') params.append('size', filters.size);
      if (filters.color !== 'All Colors') params.append('color', filters.color);
      if (filters.material !== 'All Materials') params.append('material', filters.material);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.productType !== 'all') params.append('productType', filters.productType);
      
      params.append('sortBy', sortBy);
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`${API_BASE}/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: "All",
      style: "All Styles",
      size: "All Sizes",
      color: "All Colors",
      material: "All Materials",
      minPrice: "",
      maxPrice: "",
      productType: "all"
    });
    setSearchQuery("");
    setResults([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          DISCOVER
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Advanced Search
        </h1>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search artworks, artists, styles..."
                className="w-full border border-gray-200 px-6 py-4 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
              
              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg z-10">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-[#0a0a0a] text-white px-8 py-4 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {loading ? "SEARCHING..." : "SEARCH"}
            </button>
          </div>

          {/* Trending Searches */}
          {trendingSearches.length > 0 && (
            <div className="mt-4">
              <span className="text-xs text-gray-400 mr-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TRENDING:
              </span>
              {trendingSearches.map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(term)}
                  className="text-xs text-[#c8a830] hover:underline mr-3"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              FILTERS
            </h3>
            <button
              onClick={clearFilters}
              className="text-xs text-[#c8a830] hover:underline"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CLEAR ALL
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Product Type */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TYPE
              </label>
              <select
                value={filters.productType}
                onChange={(e) => handleFilterChange('productType', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <option value="all">All Types</option>
                <option value="artwork">Artwork</option>
                <option value="fashion">Fashion</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                CATEGORY
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                STYLE
              </label>
              <select
                value={filters.style}
                onChange={(e) => handleFilterChange('style', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {allStyles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                SIZE
              </label>
              <select
                value={filters.size}
                onChange={(e) => handleFilterChange('size', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <option value="All Sizes">All Sizes</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="XLarge">XLarge</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                COLOR
              </label>
              <select
                value={filters.color}
                onChange={(e) => handleFilterChange('color', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <option value="All Colors">All Colors</option>
                {fashionColors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>

            {/* Material */}
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                MATERIAL
              </label>
              <select
                value={filters.material}
                onChange={(e) => handleFilterChange('material', e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <option value="All Materials">All Materials</option>
                {fashionMaterials.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                MIN PRICE
              </label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="$0"
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                MAX PRICE
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="$1,500+"
                className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
            </div>
          </div>
        </div>

        {/* Results Header */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {pagination.total} results found
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-200 px-4 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {results.map((product) => (
                <ArtworkCard
                  key={product.id}
                  artwork={product}
                  onAddToCart={onAddToCart}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-12 gap-2">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(i + 1)}
                    className={`w-10 h-10 text-sm transition-colors ${
                      pagination.page === i + 1
                        ? "bg-[#0a0a0a] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="text-center py-16">
              <div className="text-gray-200 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Start your search to discover beautiful artworks
              </p>
              <p className="text-gray-300 text-sm mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Use the filters above to narrow your results
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
