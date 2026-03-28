import { getStorefrontPublicConfig } from '../config/storefront.js';
import { getCatalogProductsData } from '../utils/catalog.js';

const getStorefrontCatalogProducts = () =>
  getCatalogProductsData().filter((product) => product.isPublished !== false);

const matchesFashionVariant = (product, field, value) => {
  if (product.productType !== 'fashion') {
    return product[field] === value;
  }

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.some((variant) => variant?.[field] === value);
  }

  return product[field] === value;
};

export const getCatalogProducts = async (req, res) => {
  try {
    const { productType } = req.query;

    let catalog = getStorefrontCatalogProducts();
    if (productType && productType !== 'all') {
      catalog = catalog.filter((product) => product.productType === productType);
    }

    res.json({
      success: true,
      data: catalog,
      count: catalog.length
    });
  } catch (error) {
    console.error('Get catalog products error:', error);
    res.status(500).json({
      error: 'Failed to get products',
      message: error.message
    });
  }
};

export const getStorefrontConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ...getStorefrontPublicConfig()
      }
    });
  } catch (error) {
    console.error('Get storefront config error:', error);
    res.status(500).json({
      error: 'Failed to get storefront config',
      message: error.message
    });
  }
};

// In-memory storage for user activity
let userActivity = new Map();
let productViews = new Map();
let searchHistory = new Map();

// Track product view
export const trackProductView = async (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        error: 'Product ID is required'
      });
    }

    // Update user activity
    const userViews = userActivity.get(userId) || [];
    const existingIndex = userViews.findIndex(v => v.productId === productId);
    
    const viewData = {
      productId,
      timestamp: new Date().toISOString(),
      count: existingIndex >= 0 ? userViews[existingIndex].count + 1 : 1
    };

    if (existingIndex >= 0) {
      userViews[existingIndex] = viewData;
    } else {
      userViews.push(viewData);
    }

    userActivity.set(userId, userViews);

    // Update product view counts
    const productView = productViews.get(productId) || { count: 0, viewers: [] };
    productView.count += 1;
    if (!productView.viewers.includes(userId)) {
      productView.viewers.push(userId);
    }
    productViews.set(productId, productView);

    res.json({
      success: true,
      message: 'Product view tracked'
    });

  } catch (error) {
    console.error('Track product view error:', error);
    res.status(500).json({
      error: 'Failed to track product view',
      message: error.message
    });
  }
};

// Get recently viewed products
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const { limit = 10 } = req.query;

    const userViews = userActivity.get(userId) || [];
    const catalogProducts = getStorefrontCatalogProducts();
    
    // Sort by timestamp (most recent first) and get product details
    const recentlyViewed = userViews
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit))
      .map(view => {
        const product = catalogProducts.find(p => p.id === view.productId);
        return product ? {
          ...product,
          lastViewed: view.timestamp,
          viewCount: view.count
        } : null;
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: recentlyViewed
    });

  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({
      error: 'Failed to get recently viewed products',
      message: error.message
    });
  }
};

// Get product recommendations
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.userId || 'anonymous';
    const { productId, limit = 8 } = req.query;
    const catalogProducts = getStorefrontCatalogProducts();

    let recommendations = [];

    if (productId) {
      // Get recommendations based on current product
      const currentProduct = catalogProducts.find(p => p.id === parseInt(productId));
      
      if (currentProduct) {
        // Find similar products based on category, style, and tags
        recommendations = catalogProducts
          .filter(p => p.id !== currentProduct.id)
          .map(product => {
            let score = 0;
            
            // Same category
            if (product.category === currentProduct.category) score += 3;
            
            // Same style
            if (product.style === currentProduct.style) score += 2;
            
            // Same product type
            if (product.productType === currentProduct.productType) score += 2;
            
            // Similar price range (within 20%)
            const priceDiff = Math.abs(product.price - currentProduct.price);
            const priceRange = currentProduct.price * 0.2;
            if (priceDiff <= priceRange) score += 1;
            
            // Matching tags
            const productTags = Array.isArray(product.tags) ? product.tags : [];
            const currentTags = Array.isArray(currentProduct.tags) ? currentProduct.tags : [];
            const matchingTags = productTags.filter(tag => 
              currentTags.includes(tag)
            );
            score += matchingTags.length;

            return { ...product, relevanceScore: score };
          })
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, parseInt(limit));
      }
    } else {
      // Get personalized recommendations based on user activity
      const userViews = userActivity.get(userId) || [];
      
      if (userViews.length > 0) {
        // Analyze user preferences
        const categoryPreferences = {};
        const stylePreferences = {};
        
        userViews.forEach(view => {
          const product = catalogProducts.find(p => p.id === view.productId);
          if (product) {
            categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + view.count;
            stylePreferences[product.style] = (stylePreferences[product.style] || 0) + view.count;
          }
        });

        // Get top preferences
        const topCategory = Object.keys(categoryPreferences).sort((a, b) => 
          categoryPreferences[b] - categoryPreferences[a]
        )[0];
        
        const topStyle = Object.keys(stylePreferences).sort((a, b) => 
          stylePreferences[b] - stylePreferences[a]
        )[0];

        // Recommend products based on preferences
        recommendations = catalogProducts
          .filter(p => !userViews.some(v => v.productId === p.id))
          .map(product => {
            let score = 0;
            
            if (product.category === topCategory) score += 3;
            if (product.style === topStyle) score += 2;
            if (product.isFeatured) score += 1;
            if (product.isBestseller) score += 1;
            if (product.isNew) score += 1;

            return { ...product, relevanceScore: score };
          })
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, parseInt(limit));
      } else {
        // New user - recommend featured and bestseller products
        recommendations = catalogProducts
          .filter(p => p.isFeatured || p.isBestseller)
          .slice(0, parseInt(limit));
      }
    }

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
};

// Advanced search with filters
export const advancedSearch = async (req, res) => {
  try {
    const {
      query,
      category,
      style,
      size,
      color,
      material,
      minPrice,
      maxPrice,
      productType,
      sortBy = 'relevance',
      page = 1,
      limit = 12
    } = req.query;

    let results = [...getStorefrontCatalogProducts()];

    // Text search
    if (query) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results.filter(product => {
        const searchText = `${product.title} ${product.artist} ${product.description} ${product.tags.join(' ')}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });

      // Track search
      const userId = req.user?.userId || 'anonymous';
      const searches = searchHistory.get(userId) || [];
      searches.push({
        query,
        timestamp: new Date().toISOString(),
        resultCount: results.length
      });
      searchHistory.set(userId, searches.slice(-50)); // Keep last 50 searches
    }

    // Apply filters
    if (category && category !== 'All') {
      results = results.filter(p => p.category === category);
    }

    if (style && style !== 'All Styles') {
      results = results.filter(p => p.style === style);
    }

    if (size && size !== 'All Sizes') {
      results = results.filter((product) => {
        if (product.productType === 'artwork') {
          return product.size === size;
        }

        return matchesFashionVariant(product, 'size', size) || product.clothingSize === size;
      });
    }

    if (color && color !== 'All Colors') {
      results = results.filter((product) => matchesFashionVariant(product, 'color', color));
    }

    if (material && material !== 'All Materials') {
      results = results.filter(p => p.material === material);
    }

    if (minPrice) {
      results = results.filter(p => p.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      results = results.filter(p => p.price <= parseFloat(maxPrice));
    }

    if (productType && productType !== 'all') {
      results = results.filter(p => p.productType === productType);
    }

    // Sort results
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'popular':
        results.sort((a, b) => {
          const aViews = productViews.get(a.id)?.count || 0;
          const bViews = productViews.get(b.id)?.count || 0;
          return bViews - aViews;
        });
        break;
      default: // relevance
        // Keep current order for text search, otherwise sort by featured
        if (!query) {
          results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        }
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length,
        totalPages: Math.ceil(results.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
};

// Get search suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerms = query.toLowerCase();
    
    // Get suggestions from product titles, artists, and tags
    const suggestions = new Set();
    
    getStorefrontCatalogProducts().forEach(product => {
      // Title suggestions
      if (product.title.toLowerCase().includes(searchTerms)) {
        suggestions.add(product.title);
      }
      
      // Artist suggestions
      if (product.artist.toLowerCase().includes(searchTerms)) {
        suggestions.add(product.artist);
      }
      
      // Tag suggestions
      product.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerms)) {
          suggestions.add(tag);
        }
      });
      
      // Category suggestions
      if (product.category.toLowerCase().includes(searchTerms)) {
        suggestions.add(product.category);
      }
    });

    const limitedSuggestions = Array.from(suggestions).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedSuggestions
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get search suggestions',
      message: error.message
    });
  }
};

// Get trending searches
export const getTrendingSearches = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Aggregate search terms from all users
    const searchCounts = {};
    
    for (const [userId, searches] of searchHistory.entries()) {
      searches.forEach(search => {
        const query = search.query.toLowerCase();
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      });
    }

    // Get top searches
    const trending = Object.entries(searchCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([query]) => query);

    res.json({
      success: true,
      data: trending
    });

  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({
      error: 'Failed to get trending searches',
      message: error.message
    });
  }
};

// Get product statistics
export const getProductStats = async (req, res) => {
  try {
    const { productId } = req.params;

    const productViewsData = productViews.get(parseInt(productId)) || { count: 0, viewers: [] };
    
    const stats = {
      viewCount: productViewsData.count,
      uniqueViewers: productViewsData.viewers.length,
      // Add more stats as needed
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      error: 'Failed to get product statistics',
      message: error.message
    });
  }
};

// Export for use in other modules
export { userActivity, productViews, searchHistory };
