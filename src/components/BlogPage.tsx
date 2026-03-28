import { useState, useEffect } from "react";
import type { Product } from "../data/products";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  author: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  readTime: number;
  linkedProductIds?: number[];
}

interface BlogPageProps {
  onNavigate: (page: string) => void;
  onViewDetail: (product: Product) => void;
}

export default function BlogPage({ onNavigate, onViewDetail }: BlogPageProps) {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    void Promise.all([fetchBlogPosts(), fetchCatalogProducts()]);
  }, []);

  const fetchBlogPosts = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/blog/posts?isPublished=true"));
      const data = await response.json();
      if (data.success) {
        setBlogPosts(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(getNetworkErrorMessage(err, "Failed to fetch blog posts"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogProducts = async () => {
    try {
      const response = await fetch(apiUrl("/api/shopping/products"));
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCatalogProducts(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch catalog products:", err);
    }
  };

  const categories = ["All", ...new Set(blogPosts.map(post => post.category))];

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLinkedProducts = (post: BlogPost | null) => {
    if (!post || !Array.isArray(post.linkedProductIds)) {
      return [];
    }

    return post.linkedProductIds
      .map((productId) => catalogProducts.find((product) => product.id === productId))
      .filter(Boolean) as Product[];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  if (selectedPost) {
    const linkedProducts = getLinkedProducts(selectedPost);

    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28">
        {/* Header */}
        <div className="bg-[#0a0a0a] py-16 px-6 text-center">
          <div
            className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            BLOG
          </div>
          <h1
            className="text-white text-5xl md:text-6xl font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {selectedPost.title}
          </h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
          {/* Back Button */}
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 hover:text-[#c8a830] transition-colors mb-8"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            BACK TO BLOG
          </button>

          {/* Featured Image */}
          <div className="mb-8">
            <img
              src={assetUrl(selectedPost.featuredImage)}
              alt={selectedPost.title}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>

          {/* Post Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <span>By {selectedPost.author}</span>
            <span>•</span>
            <span>{formatDate(selectedPost.publishedAt || selectedPost.createdAt)}</span>
            <span>•</span>
            <span>{selectedPost.readTime} min read</span>
            {selectedPost.linkedProductIds?.length ? (
              <>
                <span>•</span>
                <span>{selectedPost.linkedProductIds.length} linked products</span>
              </>
            ) : null}
            <span>•</span>
            <span>{selectedPost.views} views</span>
          </div>

          {/* Category and Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="bg-[#c8a830] text-white text-xs px-3 py-1 rounded">
              {selectedPost.category}
            </span>
            {selectedPost.tags.map((tag, index) => (
              <span key={index} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
          />

          {linkedProducts.length > 0 && (
            <div className="mt-12">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs tracking-[0.28em] text-[#c8a830]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    SHOP THIS STORY
                  </p>
                  <h3
                    className="text-3xl font-light text-[#0a0a0a] mt-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Linked Products
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate("shop")}
                  className="text-xs tracking-[0.16em] text-gray-600 hover:text-[#c8a830] transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  VIEW FULL SHOP
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {linkedProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onViewDetail(product)}
                    className="bg-white border border-gray-100 overflow-hidden text-left hover:shadow-lg transition-shadow"
                  >
                    <div className="grid grid-cols-[120px_minmax(0,1fr)]">
                      <div className="h-full min-h-[140px] overflow-hidden bg-gray-50">
                        <img
                          src={assetUrl(product.image)}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5">
                        <p className="text-[10px] tracking-[0.18em] text-[#c8a830]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {product.productType.toUpperCase()}
                        </p>
                        <h4
                          className="text-2xl font-light text-[#0a0a0a] mt-2"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {product.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{product.artist}</p>
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mt-4">
                          <span
                            className="text-2xl font-light text-[#0a0a0a]"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          >
                            ${product.price.toLocaleString()}
                          </span>
                          <span className="text-xs tracking-[0.16em] text-gray-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            VIEW PRODUCT
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-12 p-8 bg-white border border-gray-100 text-center">
            <h3 
              className="text-2xl font-light text-[#0a0a0a] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Inspired by this article?
            </h3>
            <p className="text-gray-600 mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Explore our collection of premium artworks and find the perfect piece for your space.
            </p>
            <button
              onClick={() => onNavigate("shop")}
              className="bg-[#0a0a0a] text-white px-8 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              BROWSE COLLECTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          INSIGHTS & INSPIRATION
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          The Sinipo Journal
        </h1>
        <p
          className="text-white/50 mt-3 text-sm tracking-wider font-light max-w-lg mx-auto"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Discover art tips, collection guides, and stories behind our curated pieces
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Featured Post */}
        {filteredPosts.length > 0 && filteredPosts[0].isFeatured && (
          <div className="mb-12">
            <div 
              className="bg-white border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPost(filteredPosts[0])}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-64 md:h-auto">
                  <img
                    src={assetUrl(filteredPosts[0].featuredImage)}
                    alt={filteredPosts[0].title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-[#c8a830] text-white text-[10px] px-2 py-1 rounded">FEATURED</span>
                    <span className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {filteredPosts[0].category}
                    </span>
                  </div>
                  <h2 
                    className="text-3xl font-light text-[#0a0a0a] mb-4"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {filteredPosts[0].title}
                  </h2>
                  <p className="text-gray-600 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {filteredPosts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    <span>By {filteredPosts[0].author}</span>
                    <span>•</span>
                    <span>{filteredPosts[0].readTime} min read</span>
                    {filteredPosts[0].linkedProductIds?.length ? (
                      <>
                        <span>•</span>
                        <span>{filteredPosts[0].linkedProductIds.length} linked</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.slice(filteredPosts[0]?.isFeatured ? 1 : 0).map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedPost(post)}
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={assetUrl(post.featuredImage)}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {post.readTime} min
                  </span>
                </div>
                <h3 
                  className="text-xl font-light text-[#0a0a0a] mb-3 leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <span>By {post.author}</span>
                  <span>
                    {post.linkedProductIds?.length ? `${post.linkedProductIds.length} linked · ` : ""}
                    {formatDate(post.publishedAt || post.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Posts Message */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-200 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              No articles found
            </p>
            <p className="text-gray-300 text-sm mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Newsletter Signup */}
        <div className="mt-16 bg-[#0a0a0a] p-8 md:p-12 text-center">
          <h3 
            className="text-3xl font-light text-white mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Stay Inspired
          </h3>
          <p 
            className="text-white/50 mb-6 max-w-md mx-auto"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Subscribe to receive the latest art insights, collection tips, and exclusive offers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 border border-gray-600 bg-transparent text-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            />
            <button
              className="bg-[#c8a830] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-[#0a0a0a] transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              SUBSCRIBE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
