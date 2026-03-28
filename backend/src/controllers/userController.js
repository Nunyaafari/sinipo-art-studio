import { users, updateUserRecord } from './authController.js';
import { getOrdersForUser } from './orderController.js';
import {
  getUserBucketValue,
  setUserBucketValue,
  removeUserBucketValue
} from '../storage/persistentState.js';

const getWishlistForUser = (userId) => getUserBucketValue('userWishlists', userId, []);
const setWishlistForUser = (userId, wishlist) => setUserBucketValue('userWishlists', userId, wishlist);

const getAddressesForUser = (userId) => getUserBucketValue('userAddresses', userId, []);
const setAddressesForUser = (userId, addresses) => setUserBucketValue('userAddresses', userId, addresses);

const getOrderHistoryForUser = (userId) => getUserBucketValue('userOrderHistory', userId, []);
const setOrderHistoryForUser = (userId, orders) => setUserBucketValue('userOrderHistory', userId, orders);

const getReviewsForUser = (userId) => getUserBucketValue('userReviews', userId, []);
const setReviewsForUser = (userId, reviews) => setUserBucketValue('userReviews', userId, reviews);

const getLoyaltyForUser = (userId) => getUserBucketValue('loyaltyPoints', userId, null);
const setLoyaltyForUser = (userId, loyalty) => setUserBucketValue('loyaltyPoints', userId, loyalty);
const loyaltyEligibleStatuses = new Set(['paid', 'processing', 'shipped', 'delivered', 'completed']);

const getLoyaltySnapshot = (userId, orders = []) => {
  const savedLoyalty = getLoyaltyForUser(userId);
  if (savedLoyalty) {
    return savedLoyalty;
  }

  const earnedPoints = orders
    .filter((order) => loyaltyEligibleStatuses.has(order.status))
    .reduce((sum, order) => sum + Math.floor(order.amount ?? order.total ?? 0), 0);

  return {
    points: earnedPoints,
    tier: calculateLoyaltyTier(earnedPoints)
  };
};

// Get User Wishlist
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = getWishlistForUser(userId);
    
    res.json({
      success: true,
      data: wishlist
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      error: 'Failed to get wishlist',
      message: error.message
    });
  }
};

// Add to Wishlist
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        error: 'Product ID is required'
      });
    }

    const wishlist = getWishlistForUser(userId);
    
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      setWishlistForUser(userId, wishlist);
    }

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      error: 'Failed to add to wishlist',
      message: error.message
    });
  }
};

// Remove from Wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const wishlist = getWishlistForUser(userId);
    const updatedWishlist = wishlist.filter(id => id !== parseInt(productId));
    setWishlistForUser(userId, updatedWishlist);

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: updatedWishlist
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      error: 'Failed to remove from wishlist',
      message: error.message
    });
  }
};

// Get User Addresses
export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const addresses = getAddressesForUser(userId);
    
    res.json({
      success: true,
      data: addresses
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      error: 'Failed to get addresses',
      message: error.message
    });
  }
};

// Add New Address
export const addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { label, firstName, lastName, address, city, country, phone, isDefault } = req.body;

    if (!label || !firstName || !lastName || !address || !city || !country || !phone) {
      return res.status(400).json({
        error: 'All address fields are required'
      });
    }

    const addresses = getAddressesForUser(userId);
    
    // If this is set as default, remove default from others
    if (isDefault) {
      addresses.forEach(addr => addr.isDefault = false);
    }

    const newAddress = {
      id: Math.max(...addresses.map(a => a.id), 0) + 1,
      label,
      firstName,
      lastName,
      address,
      city,
      country,
      phone,
      isDefault: isDefault || addresses.length === 0
    };

    addresses.push(newAddress);
    setAddressesForUser(userId, addresses);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: newAddress
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      error: 'Failed to add address',
      message: error.message
    });
  }
};

// Update Address
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const addresses = getAddressesForUser(userId);
    const addressIndex = addresses.findIndex(a => a.id === parseInt(id));

    if (addressIndex === -1) {
      return res.status(404).json({
        error: 'Address not found'
      });
    }

    // If setting as default, remove default from others
    if (updateData.isDefault) {
      addresses.forEach(addr => addr.isDefault = false);
    }

    addresses[addressIndex] = { ...addresses[addressIndex], ...updateData };
    setAddressesForUser(userId, addresses);

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: addresses[addressIndex]
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      error: 'Failed to update address',
      message: error.message
    });
  }
};

// Delete Address
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const addresses = getAddressesForUser(userId);
    const updatedAddresses = addresses.filter(a => a.id !== parseInt(id));
    if (updatedAddresses.length === 0) {
      removeUserBucketValue('userAddresses', userId);
    } else {
      setAddressesForUser(userId, updatedAddresses);
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      error: 'Failed to delete address',
      message: error.message
    });
  }
};

// Get Order History
export const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = users.find((candidate) => candidate.id === userId);
    const storedOrders = getOrderHistoryForUser(userId);
    const liveOrders = getOrdersForUser({
      userId,
      email: user?.email
    }).map((order, index) => ({
      id: order.id || index + 1,
      reference: order.reference,
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            productId: item.artwork?.id || item.productId || 0,
            title: item.artwork?.title || item.title || 'Untitled Product',
            artist: item.artwork?.artist || item.artist || 'Sinipo Art Studio',
            quantity: item.quantity || 1,
            price: item.artwork?.price || item.price || 0,
            image: item.artwork?.image || item.image || '',
            images: Array.isArray(item.artwork?.images) ? item.artwork.images : [],
            productType: item.artwork?.productType || item.productType || 'artwork',
            category: item.artwork?.category || item.category || 'General',
            subcategory: item.artwork?.subcategory || item.subcategory || item.artwork?.category || 'General',
            style: item.artwork?.style || item.style || 'Contemporary',
            size: item.artwork?.size || item.size || 'Medium',
            dimensions: item.artwork?.dimensions || item.dimensions || '',
            clothingSize: item.artwork?.clothingSize || item.clothingSize || '',
            color: item.artwork?.color || item.color || '',
            material: item.artwork?.material || item.material || '',
            sku: item.artwork?.sku || item.sku || '',
            selectedVariantId: item.artwork?.selectedVariantId || item.selectedVariantId || null,
            description: item.artwork?.description || item.description || '',
            tags: Array.isArray(item.artwork?.tags) ? item.artwork.tags : Array.isArray(item.tags) ? item.tags : [],
            careInstructions: item.artwork?.careInstructions || item.careInstructions || '',
            inStock: item.artwork?.inStock ?? item.inStock ?? true,
            stockQuantity: item.artwork?.stockQuantity ?? item.stockQuantity ?? item.quantity ?? 1,
            frameColor: item.artwork?.frameColor || item.frameColor || null
          }))
        : [],
      total: order.amount,
      subtotal: order.subtotal ?? order.amount,
      shipping: order.shipping ?? 0,
      discountAmount: order.discountAmount ?? 0,
      status: order.status,
      paymentMode: order.paymentMode || 'paystack',
      customerInfo: order.customerInfo,
      date: order.createdAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt || null,
      processingAt: order.processingAt || null,
      shippedAt: order.shippedAt || null,
      deliveredAt: order.deliveredAt || null,
      failedAt: order.failedAt || null,
      cancelledAt: order.cancelledAt || null,
      refundedAt: order.refundedAt || null,
      inventoryAdjustedAt: order.inventoryAdjustedAt || null,
      inventoryRestoredAt: order.inventoryRestoredAt || null,
      trackingNumber: order.trackingNumber || null
    }));

    const mergedOrders = [...liveOrders];
    storedOrders.forEach((storedOrder) => {
      if (!mergedOrders.some((order) => order.reference === storedOrder.reference)) {
        mergedOrders.push(storedOrder);
      }
    });

    mergedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      data: mergedOrders
    });

  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      error: 'Failed to get order history',
      message: error.message
    });
  }
};

// Add Order to History
export const addOrderToHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reference, items, total, status } = req.body;

    const orders = getOrderHistoryForUser(userId);
    
    const newOrder = {
      id: Math.max(...orders.map(o => o.id), 0) + 1,
      reference,
      items,
      total,
      status: status || 'delivered',
      date: new Date().toISOString()
    };

    orders.unshift(newOrder); // Add to beginning
    setOrderHistoryForUser(userId, orders);

    // Award loyalty points (1 point per dollar spent)
    const currentPoints = getLoyaltyForUser(userId) || { points: 0, tier: "Bronze" };
    const newPoints = currentPoints.points + Math.floor(total);
    const newTier = calculateLoyaltyTier(newPoints);
    
    setLoyaltyForUser(userId, { points: newPoints, tier: newTier });

    res.status(201).json({
      success: true,
      message: 'Order added to history',
      data: newOrder
    });

  } catch (error) {
    console.error('Add order to history error:', error);
    res.status(500).json({
      error: 'Failed to add order to history',
      message: error.message
    });
  }
};

// Get User Reviews
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reviews = getReviewsForUser(userId);
    
    res.json({
      success: true,
      data: reviews
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      error: 'Failed to get user reviews',
      message: error.message
    });
  }
};

// Add Product Review
export const addReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, rating, comment } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        error: 'Product ID, rating, and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    const reviews = getReviewsForUser(userId);
    
    // Check if user already reviewed this product
    const existingReview = reviews.find(r => r.productId === productId);
    if (existingReview) {
      return res.status(400).json({
        error: 'You have already reviewed this product'
      });
    }

    const newReview = {
      id: Math.max(...reviews.map(r => r.id), 0) + 1,
      productId,
      rating,
      comment,
      date: new Date().toISOString()
    };

    reviews.push(newReview);
    setReviewsForUser(userId, reviews);

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: newReview
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      error: 'Failed to add review',
      message: error.message
    });
  }
};

// Get Loyalty Points
export const getLoyaltyPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = users.find((candidate) => candidate.id === userId);
    const orders = getOrdersForUser({
      userId,
      email: user?.email
    });
    const loyalty = getLoyaltySnapshot(userId, orders);
    
    res.json({
      success: true,
      data: loyalty
    });

  } catch (error) {
    console.error('Get loyalty points error:', error);
    res.status(500).json({
      error: 'Failed to get loyalty points',
      message: error.message
    });
  }
};

// Calculate Loyalty Tier
const calculateLoyaltyTier = (points) => {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
};

// Get Personalized Recommendations
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = getWishlistForUser(userId);
    const orders = getOrderHistoryForUser(userId);
    const reviews = getReviewsForUser(userId);

    // Simple recommendation logic based on user activity
    // In production, this would use ML algorithms
    const purchasedCategories = orders.flatMap(order => 
      order.items.map(item => item.category)
    ).filter(Boolean);

    const wishlistCategories = wishlist.map(productId => {
      // This would normally fetch from product database
      return productId <= 2 ? "Abstract" : "Fashion";
    });

    const preferredCategories = [...new Set([...purchasedCategories, ...wishlistCategories])];

    const recommendations = {
      basedOnPurchase: preferredCategories.slice(0, 3),
      basedOnWishlist: wishlist.slice(0, 5),
      trending: [3, 101, 102], // Sample trending products
      newArrivals: [103, 104] // Sample new arrivals
    };

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

// Get User Statistics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = users.find((candidate) => candidate.id === userId);
    
    const wishlist = getWishlistForUser(userId);
    const orders = getOrdersForUser({
      userId,
      email: user?.email
    });
    const reviews = getReviewsForUser(userId);
    const loyalty = getLoyaltySnapshot(userId, orders);

    const stats = {
      wishlistCount: wishlist.length,
      orderCount: orders.length,
      reviewCount: reviews.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      loyaltyPoints: loyalty.points,
      loyaltyTier: loyalty.tier,
      averageRating: reviews.length > 0 
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      message: error.message
    });
  }
};

export const syncCustomerProfileFromCheckout = ({ userId, customerInfo }) => {
  if (!userId || !customerInfo) {
    return null;
  }

  const updatedUser = updateUserRecord(userId, {
    firstName: customerInfo.firstName,
    lastName: customerInfo.lastName,
    phone: customerInfo.phone,
    address: customerInfo.address,
    city: customerInfo.city,
    country: customerInfo.country
  });

  const addresses = getAddressesForUser(userId);
  const normalizedAddress = {
    label: 'Checkout Address',
    firstName: customerInfo.firstName,
    lastName: customerInfo.lastName,
    address: customerInfo.address,
    city: customerInfo.city,
    country: customerInfo.country,
    phone: customerInfo.phone
  };

  const existingAddressIndex = addresses.findIndex((address) =>
    address.address === normalizedAddress.address &&
    address.city === normalizedAddress.city &&
    address.country === normalizedAddress.country &&
    address.phone === normalizedAddress.phone
  );

  if (existingAddressIndex >= 0) {
    addresses[existingAddressIndex] = {
      ...addresses[existingAddressIndex],
      ...normalizedAddress,
      isDefault: true
    };
  } else {
    addresses.forEach((address) => {
      address.isDefault = false;
    });

    addresses.unshift({
      id: Math.max(...addresses.map((address) => address.id), 0) + 1,
      ...normalizedAddress,
      isDefault: true
    });
  }

  setAddressesForUser(userId, addresses);

  return updatedUser;
};

// Export for use in other modules
export {
  getWishlistForUser,
  getAddressesForUser,
  getOrderHistoryForUser,
  getReviewsForUser,
  getLoyaltyForUser
};
