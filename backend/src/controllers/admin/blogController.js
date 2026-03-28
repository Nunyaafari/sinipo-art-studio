import { getBlogPostsState, savePersistentState } from '../../storage/persistentState.js';
import { resolveMediaUrlsByIds, syncMediaAssetIdsForUrls } from '../../utils/mediaAssets.js';
import { recordAdminAudit } from '../../utils/adminAudit.js';
import {
  assertMinLength,
  assertRequiredFields,
  createHttpError,
  normalizeString
} from '../../utils/validation.js';

const blogPosts = getBlogPostsState();
export const getAllBlogPostsData = () => [...blogPosts];
export const getPublishedBlogPostsData = () => blogPosts.filter((post) => post.isPublished);
const buildSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const normalizeLinkedProductIds = (value) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => Number.parseInt(item, 10))
            .filter((item) => Number.isFinite(item) && item > 0)
        )
      )
    : [];

const validateBlogPayload = (payload) => {
  assertRequiredFields(payload, [
    { key: 'title', label: 'title' },
    { key: 'excerpt', label: 'excerpt' },
    { key: 'content', label: 'content' },
    { key: 'author', label: 'author' },
    { key: 'category', label: 'category' }
  ]);

  assertMinLength(normalizeString(payload.title), 3, 'Title must be at least 3 characters long');
  assertMinLength(normalizeString(payload.excerpt), 10, 'Excerpt must be at least 10 characters long');
  assertMinLength(normalizeString(payload.content), 30, 'Content must be at least 30 characters long');
};

const respondWithBlogError = (res, error, fallbackError) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? fallbackError : error.message,
    message: error.message
  });
};

// Get all blog posts
export const getAllBlogPosts = async (req, res) => {
  try {
    const { category, tag, search, isPublished, isFeatured, page = 1, limit = 10 } = req.query;
    
    let filteredPosts = [...blogPosts];

    // Apply filters
    if (category && category !== 'All') {
      filteredPosts = filteredPosts.filter(post => post.category === category);
    }
    if (tag) {
      filteredPosts = filteredPosts.filter(post => post.tags.includes(tag));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower)
      );
    }
    if (isPublished !== undefined) {
      filteredPosts = filteredPosts.filter(post => 
        isPublished === 'true' ? post.isPublished : !post.isPublished
      );
    }
    if (isFeatured === 'true') {
      filteredPosts = filteredPosts.filter(post => post.isFeatured);
    }

    // Sort by published date (newest first)
    filteredPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedPosts,
      count: paginatedPosts.length,
      total: filteredPosts.length,
      page: parseInt(page),
      totalPages: Math.ceil(filteredPosts.length / limit)
    });

  } catch (error) {
    console.error('Get all blog posts error:', error);
    res.status(500).json({
      error: 'Failed to get blog posts',
      message: error.message
    });
  }
};

// Get blog post by ID or slug
export const getBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let post = blogPosts.find(p => p.id === parseInt(id));
    if (!post) {
      post = blogPosts.find(p => p.slug === id);
    }

    if (!post) {
      return res.status(404).json({
        error: 'Blog post not found'
      });
    }

    // Increment views
    post.views += 1;
    post.updatedAt = new Date().toISOString();
    savePersistentState();

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({
      error: 'Failed to get blog post',
      message: error.message
    });
  }
};

// Create new blog post
export const createBlogPost = async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      author,
      category,
      tags,
      linkedProductIds,
      isPublished,
      isFeatured
    } = req.body;
    const providedFeaturedImageAssetId = Number.parseInt(req.body.featuredImageAssetId, 10);
    const resolvedFeaturedImage =
      !Number.isNaN(providedFeaturedImageAssetId)
        ? resolveMediaUrlsByIds([providedFeaturedImageAssetId])[0]
        : null;

    validateBlogPayload(req.body);
    const normalizedTitle = normalizeString(title);
    const normalizedExcerpt = normalizeString(excerpt);
    const normalizedContent = normalizeString(content);
    const normalizedAuthor = normalizeString(author);
    const normalizedCategory = normalizeString(category);

    // Generate slug from title
    const slug = buildSlug(normalizedTitle);

    // Check if slug already exists
    const existingPost = blogPosts.find(p => p.slug === slug);
    if (existingPost) {
      throw createHttpError(400, 'A post with this title already exists');
    }

    // Generate new ID
    const newId = Math.max(...blogPosts.map(p => p.id), 0) + 1;

    // Calculate read time (average 200 words per minute)
    const wordCount = normalizedContent.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    const newPost = {
      id: newId,
      title: normalizedTitle,
      slug,
      excerpt: normalizedExcerpt,
      content: normalizedContent,
      featuredImage: resolvedFeaturedImage || featuredImage || "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
      featuredImageAssetId: null,
      author: normalizedAuthor,
      category: normalizedCategory,
      tags: tags || [],
      linkedProductIds: normalizeLinkedProductIds(linkedProductIds),
      isPublished: isPublished === true || isPublished === 'true',
      isFeatured: isFeatured === true || isFeatured === 'true',
      publishedAt: (isPublished === true || isPublished === 'true') ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      readTime
    };

    newPost.featuredImageAssetId = syncMediaAssetIdsForUrls([newPost.featuredImage], {
      type: 'blog',
      title,
      altText: title,
      source: 'blog'
    })[0] || null;

    blogPosts.push(newPost);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'blog.create',
      targetType: 'blogPost',
      targetId: newPost.id,
      summary: `Created blog post "${newPost.title}"`,
      changes: {
        title: newPost.title,
        isPublished: newPost.isPublished,
        isFeatured: newPost.isFeatured,
        linkedProductIds: newPost.linkedProductIds
      }
    });

    res.status(201).json({
      success: true,
      data: newPost,
      message: 'Blog post created successfully'
    });

  } catch (error) {
    console.error('Create blog post error:', error);
    respondWithBlogError(res, error, 'Failed to create blog post');
  }
};

// Update blog post
export const updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const providedFeaturedImageAssetId = Number.parseInt(updateData.featuredImageAssetId, 10);
    const resolvedFeaturedImage =
      !Number.isNaN(providedFeaturedImageAssetId)
        ? resolveMediaUrlsByIds([providedFeaturedImageAssetId])[0]
        : null;

    const postIndex = blogPosts.findIndex(p => p.id === parseInt(id));

    if (postIndex === -1) {
      return res.status(404).json({
        error: 'Blog post not found'
      });
    }

    const nextPayload = {
      ...blogPosts[postIndex],
      ...updateData
    };
    validateBlogPayload(nextPayload);

    // Check if slug already exists (if updating title)
    if (updateData.title) {
      const newSlug = buildSlug(normalizeString(updateData.title));

      const existingPost = blogPosts.find(p => p.slug === newSlug && p.id !== parseInt(id));
      if (existingPost) {
        throw createHttpError(400, 'A post with this title already exists');
      }
      updateData.slug = newSlug;
      updateData.title = normalizeString(updateData.title);
    }

    if (updateData.excerpt !== undefined) {
      updateData.excerpt = normalizeString(updateData.excerpt);
    }
    if (updateData.content !== undefined) {
      updateData.content = normalizeString(updateData.content);
    }
    if (updateData.author !== undefined) {
      updateData.author = normalizeString(updateData.author);
    }
    if (updateData.category !== undefined) {
      updateData.category = normalizeString(updateData.category);
    }

    // Calculate read time if content is updated
    if (updateData.content) {
      const wordCount = updateData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      updateData.readTime = Math.ceil(wordCount / 200);
    }

    // Update publishedAt if publishing for the first time
    if (updateData.isPublished && !blogPosts[postIndex].isPublished) {
      updateData.publishedAt = new Date().toISOString();
    }

    // Update blog post
    const previousPost = {
      title: blogPosts[postIndex].title,
      isPublished: blogPosts[postIndex].isPublished,
      linkedProductIds: Array.isArray(blogPosts[postIndex].linkedProductIds)
        ? [...blogPosts[postIndex].linkedProductIds]
        : []
    };
    const updatedPost = {
      ...blogPosts[postIndex],
      ...updateData,
      linkedProductIds:
        updateData.linkedProductIds !== undefined
          ? normalizeLinkedProductIds(updateData.linkedProductIds)
          : normalizeLinkedProductIds(blogPosts[postIndex].linkedProductIds),
      featuredImage: resolvedFeaturedImage || updateData.featuredImage || blogPosts[postIndex].featuredImage,
      id: parseInt(id), // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    updatedPost.featuredImageAssetId = updatedPost.featuredImage
      ? syncMediaAssetIdsForUrls([updatedPost.featuredImage], {
          type: 'blog',
          title: updatedPost.title,
          altText: updatedPost.title,
          source: 'blog'
        })[0] || null
      : null;

    blogPosts[postIndex] = updatedPost;
    savePersistentState();
    recordAdminAudit(req, {
      action: 'blog.update',
      targetType: 'blogPost',
      targetId: updatedPost.id,
      summary: `Updated blog post "${updatedPost.title}"`,
      changes: {
        before: {
          title: previousPost.title,
          isPublished: previousPost.isPublished,
          linkedProductIds: previousPost.linkedProductIds
        },
        after: {
          title: updatedPost.title,
          isPublished: updatedPost.isPublished,
          linkedProductIds: updatedPost.linkedProductIds
        }
      }
    });

    res.json({
      success: true,
      data: updatedPost,
      message: 'Blog post updated successfully'
    });

  } catch (error) {
    console.error('Update blog post error:', error);
    respondWithBlogError(res, error, 'Failed to update blog post');
  }
};

// Delete blog post
export const deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const postIndex = blogPosts.findIndex(p => p.id === parseInt(id));

    if (postIndex === -1) {
      return res.status(404).json({
        error: 'Blog post not found'
      });
    }

    const deletedPost = blogPosts[postIndex];
    blogPosts.splice(postIndex, 1);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'blog.delete',
      targetType: 'blogPost',
      targetId: deletedPost.id,
      summary: `Deleted blog post "${deletedPost.title}"`,
      metadata: {
        title: deletedPost.title,
        slug: deletedPost.slug
      }
    });

    res.json({
      success: true,
      data: deletedPost,
      message: 'Blog post deleted successfully'
    });

  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      error: 'Failed to delete blog post',
      message: error.message
    });
  }
};

// Get blog statistics
export const getBlogStats = async (req, res) => {
  try {
    const stats = {
      total: blogPosts.length,
      published: blogPosts.filter(p => p.isPublished).length,
      drafts: blogPosts.filter(p => !p.isPublished).length,
      featured: blogPosts.filter(p => p.isFeatured).length,
      totalViews: blogPosts.reduce((sum, p) => sum + p.views, 0),
      categories: [...new Set(blogPosts.map(p => p.category))],
      tags: [...new Set(blogPosts.flatMap(p => p.tags))],
      averageReadTime: blogPosts.length
        ? Math.round(blogPosts.reduce((sum, p) => sum + p.readTime, 0) / blogPosts.length)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get blog stats error:', error);
    res.status(500).json({
      error: 'Failed to get blog statistics',
      message: error.message
    });
  }
};

// Get blog categories
export const getBlogCategories = async (req, res) => {
  try {
    const categories = [...new Set(blogPosts.map(p => p.category))];
    
    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get blog categories error:', error);
    res.status(500).json({
      error: 'Failed to get blog categories',
      message: error.message
    });
  }
};

// Get blog tags
export const getBlogTags = async (req, res) => {
  try {
    const tags = [...new Set(blogPosts.flatMap(p => p.tags))];
    
    res.json({
      success: true,
      data: tags
    });

  } catch (error) {
    console.error('Get blog tags error:', error);
    res.status(500).json({
      error: 'Failed to get blog tags',
      message: error.message
    });
  }
};
