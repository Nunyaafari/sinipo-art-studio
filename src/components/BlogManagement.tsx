import { useState, useEffect } from "react";
import FileUpload from "./FileUpload";
import MediaLibraryPicker from "./MediaLibraryPicker";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import {
  canEditAdminContent,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";
import { MediaAsset, getMediaSelectionsFromUpload } from "../lib/media";
import type { Product } from "../data/products";
import { validateBlogPostPayload } from "../lib/formValidation";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageAssetId?: number | null;
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

interface BlogManagementProps {
  onBack: () => void;
}

export default function BlogManagement({ onBack }: BlogManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canEdit = canEditAdminContent(user?.role);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    featuredImageAssetId: null as number | null,
    author: "Sinipo Art Team",
    category: "Art Tips",
    tags: "",
    linkedProductIds: [] as number[],
    isPublished: false,
    isFeatured: false
  });

  useEffect(() => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    void fetchBlogPosts();
    void fetchStats();
    void fetchCatalogProducts();
  }, [hasPanelAccess]);

  const fetchBlogPosts = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/blog"), {
        headers: getAdminRequestHeaders()
      });
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

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/blog/stats"), {
        headers: getAdminRequestHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (result: unknown) => {
    const selection = getMediaSelectionsFromUpload(result)[0];

    if (!selection) {
      setError("The upload completed, but no blog image URL was returned.");
      return;
    }

    setError(null);
    setFormData((prev) => ({
      ...prev,
      featuredImage: selection.url,
      featuredImageAssetId: selection.assetId ?? null,
    }));
  };

  const handleMediaLibrarySelect = (assets: MediaAsset[]) => {
    const asset = assets[0];
    if (!asset) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      featuredImage: asset.url,
      featuredImageAssetId: asset.id,
    }));
    setShowMediaLibrary(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      return;
    }

    const validationError = validateBlogPostPayload(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = editingPost 
        ? apiUrl(`/api/admin/blog/${editingPost.id}`)
        : apiUrl("/api/admin/blog");
      
      const method = editingPost ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify({
          ...formData,
          featuredImageAssetId: formData.featuredImageAssetId,
          tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
          linkedProductIds: formData.linkedProductIds
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchBlogPosts();
        await fetchStats();
        resetForm();
        setShowCreateForm(false);
        setEditingPost(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(getNetworkErrorMessage(err, "Failed to save blog post"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage,
      featuredImageAssetId: post.featuredImageAssetId ?? null,
      author: post.author,
      category: post.category,
      tags: post.tags.join(", "),
      linkedProductIds: Array.isArray(post.linkedProductIds) ? post.linkedProductIds : [],
      isPublished: post.isPublished,
      isFeatured: post.isFeatured
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!canEdit) {
      return;
    }

    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const response = await fetch(apiUrl(`/api/admin/blog/${id}`), {
        method: "DELETE",
        headers: getAdminRequestHeaders()
      });

      const data = await response.json();
      if (data.success) {
        await fetchBlogPosts();
        await fetchStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(getNetworkErrorMessage(err, "Failed to delete blog post"));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      featuredImage: "",
      featuredImageAssetId: null,
      author: "Sinipo Art Team",
      category: "Art Tips",
      tags: "",
      linkedProductIds: [],
      isPublished: false,
      isFeatured: false
    });
  };

  const getStatusColor = (isPublished: boolean) => {
    return isPublished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">BLOG MANAGEMENT</p>
          <h1 className="mt-4 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review editorial content.
          </p>
          <button
            onClick={onBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (loading && blogPosts.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">EDITORIAL CONTROL</p>
            <h1 className="mt-3 text-4xl font-light md:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Blog Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Manage published stories, drafts, and linked product content in one tighter editorial view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] tracking-[0.18em] text-white/80">
              {getRoleLabel(user?.role)}
            </span>
            <button
              onClick={onBack}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {!canEdit && (
          <div className="mb-6 border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
            You are in view-only mode. Creating, editing, and deleting blog posts is disabled.
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TOTAL POSTS
              </h3>
              <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.total}
              </p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                PUBLISHED
              </h3>
              <p className="text-3xl font-light text-green-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.published}
              </p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TOTAL VIEWS
              </h3>
              <p className="text-3xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.totalViews.toLocaleString()}
              </p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                AVG READ TIME
              </h3>
              <p className="text-3xl font-light text-purple-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.averageReadTime} min
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => {
                resetForm();
                setEditingPost(null);
                setShowCreateForm(true);
              }}
              className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              + CREATE NEW POST
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && canEdit && (
          <div className="bg-white border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {editingPost ? "Edit Blog Post" : "Create New Blog Post"}
            </h2>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  TITLE *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  EXCERPT *
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange("excerpt", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none resize-none"
                  rows={3}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  CONTENT (HTML) *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none resize-none font-mono"
                  rows={10}
                  placeholder="<p>Your blog content here...</p>"
                  required
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  FEATURED IMAGE
                </label>
                <FileUpload
                  onUpload={handleImageUpload}
                  onError={(uploadError) => setError(uploadError)}
                  type="blog"
                  className="mb-3"
                >
                  <div className="border border-dashed border-gray-300 bg-[#fbfaf6] p-4 text-center">
                    <p className="text-sm text-[#0a0a0a]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      Upload blog cover image
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Drag file here or click to browse
                    </p>
                  </div>
                </FileUpload>
                <button
                  type="button"
                  onClick={() => setShowMediaLibrary(true)}
                  className="border border-gray-200 bg-white text-gray-600 px-4 py-2 text-[11px] tracking-[0.18em] hover:border-gray-400 transition-colors mb-3"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  OPEN MEDIA LIBRARY
                </button>
                {formData.featuredImage && (
                  <div className="border border-gray-200 bg-white p-3">
                    <div className="aspect-[16/10] overflow-hidden bg-gray-50 mb-2">
                      <img
                        src={assetUrl(formData.featuredImage)}
                        alt="Featured blog preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400 truncate" title={formData.featuredImage}>
                        {formData.featuredImage}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            featuredImage: "",
                            featuredImageAssetId: null,
                          }))
                        }
                        className="text-xs text-red-500 hover:underline shrink-0"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  AUTHOR *
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange("author", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  CATEGORY *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none bg-white"
                >
                  <option value="Art Tips">Art Tips</option>
                  <option value="Art Education">Art Education</option>
                  <option value="Interior Design">Interior Design</option>
                  <option value="Artist Spotlight">Artist Spotlight</option>
                  <option value="Collection Guide">Collection Guide</option>
                  <option value="News">News</option>
                </select>
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  TAGS (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="art, tips, guide"
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  LINKED PRODUCTS
                </label>
                <div className="border border-gray-200 bg-[#fbfaf6] p-4 max-h-64 overflow-y-auto space-y-2">
                  {catalogProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">No live catalog products available to link yet.</p>
                  ) : (
                    catalogProducts.map((product) => {
                      const isSelected = formData.linkedProductIds.includes(product.id);

                      return (
                        <label
                          key={product.id}
                          className={`flex items-start gap-3 border px-3 py-3 cursor-pointer transition-colors ${
                            isSelected ? "border-[#c8a830] bg-white" : "border-gray-200 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                linkedProductIds: event.target.checked
                                  ? [...prev.linkedProductIds, product.id]
                                  : prev.linkedProductIds.filter((id) => id !== product.id),
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-[#0a0a0a]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                              {product.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product.productType.toUpperCase()} · {product.category} · ${product.price}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Selected: {formData.linkedProductIds.length} product{formData.linkedProductIds.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => handleInputChange("isPublished", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Publish immediately</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange("isFeatured", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Featured post</span>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#0a0a0a] text-white px-8 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {loading ? "SAVING..." : (editingPost ? "UPDATE POST" : "CREATE POST")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingPost(null);
                    resetForm();
                  }}
                  className="border border-gray-200 text-gray-600 px-8 py-3 text-xs tracking-[0.2em] hover:border-gray-400 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Blog Posts Table */}
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Blog Posts ({blogPosts.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    POST
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    AUTHOR
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    CATEGORY
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    STATUS
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    LINKED
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    VIEWS
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {blogPosts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 border-2 border-gray-200 overflow-hidden">
                          <img
                            src={assetUrl(post.featuredImage)}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-[#0a0a0a] font-light text-sm leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {post.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">{post.readTime} min read</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{post.author}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[10px] px-2 py-1 rounded ${getStatusColor(post.isPublished)}`}>
                          {post.isPublished ? "PUBLISHED" : "DRAFT"}
                        </span>
                        {post.isFeatured && (
                          <span className="bg-[#c8a830]/20 text-[#c8a830] text-[10px] px-2 py-1 rounded">FEATURED</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{post.linkedProductIds?.length || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{post.views}</td>
                    <td className="px-6 py-4">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(post)}
                            className="text-xs text-[#c8a830] hover:underline"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="text-xs text-red-500 hover:underline"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            DELETE
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MediaLibraryPicker
        open={showMediaLibrary}
        mode="single"
        assetType="blog"
        selectedIds={
          typeof formData.featuredImageAssetId === "number" ? [formData.featuredImageAssetId] : []
        }
        title="Blog Media Library"
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaLibrarySelect}
      />
    </div>
  );
}
