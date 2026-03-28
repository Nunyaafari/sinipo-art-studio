import { users } from '../authController.js';
import { getOrdersForUser } from '../orderController.js';
import { userActivity } from '../shoppingController.js';
import { getCatalogProductsData } from '../../utils/catalog.js';
import { getUserBucketValue } from '../../storage/persistentState.js';
import { normalizeString } from '../../utils/validation.js';

const CUSTOMER_ROLE = 'user';
const loyaltyEligibleStatuses = new Set(['paid', 'processing', 'shipped', 'delivered', 'completed']);

const getSafeUserId = (user) => {
  const parsed = Number.parseInt(user?.id, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateLoyaltyTier = (points) => {
  if (points >= 1000) return 'Platinum';
  if (points >= 500) return 'Gold';
  if (points >= 200) return 'Silver';
  return 'Bronze';
};

const getActivityTimestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCatalogMap = () =>
  new Map(
    getCatalogProductsData().map((product) => [
      product.id,
      {
        id: product.id,
        title: product.title,
        image: product.image || (Array.isArray(product.images) ? product.images[0] : ''),
        category: product.category,
        productType: product.productType
      }
    ])
  );

const getRecentViewsForUser = (userId) => {
  const numericKey = userActivity.get(userId);
  const stringKey = userActivity.get(String(userId));
  const entries = Array.isArray(numericKey) ? numericKey : Array.isArray(stringKey) ? stringKey : [];

  return [...entries].sort((left, right) => getActivityTimestamp(right.timestamp) - getActivityTimestamp(left.timestamp));
};

const getSerializableOrder = (order) => ({
  reference: order.reference,
  status: order.status,
  amount: Number(order.amount || 0),
  createdAt: order.createdAt,
  itemCount: Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0
});

const buildCustomerRecord = (user, catalogMap) => {
  const userId = getSafeUserId(user);
  const orders = getOrdersForUser({ userId, email: user.email });
  const wishlist = getUserBucketValue('userWishlists', userId, []);
  const addresses = getUserBucketValue('userAddresses', userId, []);
  const reviews = getUserBucketValue('userReviews', userId, []);
  const savedLoyalty = getUserBucketValue('loyaltyPoints', userId, null);
  const recentViews = getRecentViewsForUser(userId);
  const loyaltyPoints = savedLoyalty?.points
    ?? orders
      .filter((order) => loyaltyEligibleStatuses.has(order.status))
      .reduce((sum, order) => sum + Math.floor(Number(order.amount || 0)), 0);
  const loyaltyTier = savedLoyalty?.tier || calculateLoyaltyTier(loyaltyPoints);
  const totalSpent = orders
    .filter((order) => loyaltyEligibleStatuses.has(order.status))
    .reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const recentOrders = [...orders]
    .sort((left, right) => getActivityTimestamp(right.createdAt) - getActivityTimestamp(left.createdAt))
    .slice(0, 5)
    .map(getSerializableOrder);
  const wishlistItems = wishlist.slice(0, 6).map((productId) => {
    const product = catalogMap.get(Number(productId));
    return {
      productId: Number(productId),
      title: product?.title || `Product #${productId}`,
      image: product?.image || '',
      category: product?.category || 'Unknown',
      productType: product?.productType || 'artwork'
    };
  });
  const recentlyViewed = recentViews.slice(0, 6).map((view) => {
    const product = catalogMap.get(Number(view.productId));
    return {
      productId: Number(view.productId),
      title: product?.title || `Product #${view.productId}`,
      image: product?.image || '',
      category: product?.category || 'Unknown',
      viewedAt: view.timestamp,
      viewCount: Number(view.count || 0)
    };
  });
  const activityTimestamps = [
    getActivityTimestamp(user.lastLogin),
    getActivityTimestamp(user.updatedAt),
    ...recentOrders.map((order) => getActivityTimestamp(order.createdAt)),
    ...recentlyViewed.map((entry) => getActivityTimestamp(entry.viewedAt))
  ];
  const lastActivityAt = Math.max(...activityTimestamps, 0);

  return {
    id: userId,
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Customer',
    role: user.role,
    isVerified: Boolean(user.isVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin || null,
    phone: user.phone || '',
    address: user.address || '',
    city: user.city || '',
    country: user.country || '',
    metrics: {
      totalSpent,
      orderCount: orders.length,
      wishlistCount: wishlist.length,
      reviewCount: reviews.length,
      addressCount: addresses.length,
      loyaltyPoints,
      loyaltyTier
    },
    lastOrderAt: recentOrders[0]?.createdAt || null,
    lastOrderReference: recentOrders[0]?.reference || null,
    lastActivityAt: lastActivityAt > 0 ? new Date(lastActivityAt).toISOString() : null,
    recentOrders,
    wishlistItems,
    recentlyViewed,
    recentReviews: [...reviews]
      .sort((left, right) => getActivityTimestamp(right.date) - getActivityTimestamp(left.date))
      .slice(0, 3)
      .map((review) => ({
        id: review.id,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        date: review.date
      })),
    addresses: addresses.slice(0, 3)
  };
};

export const getCustomerCRM = async (req, res) => {
  try {
    const query = normalizeString(req.query.search).toLowerCase();
    const catalogMap = getCatalogMap();

    const customers = users
      .filter((user) => user?.role === CUSTOMER_ROLE && user?.email)
      .map((user) => buildCustomerRecord(user, catalogMap))
      .filter((customer) => {
        if (!query) {
          return true;
        }

        const haystack = [
          customer.fullName,
          customer.email,
          customer.phone,
          customer.city,
          customer.country,
          customer.lastOrderReference
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => getActivityTimestamp(right.lastActivityAt || right.createdAt) - getActivityTimestamp(left.lastActivityAt || left.createdAt));

    const now = Date.now();
    const activeWindowMs = 30 * 24 * 60 * 60 * 1000;
    const stats = {
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter((customer) => customer.isVerified).length,
      activeCustomers: customers.filter((customer) => {
        const lastActivity = getActivityTimestamp(customer.lastActivityAt || customer.lastLogin || customer.createdAt);
        return lastActivity > 0 && now - lastActivity <= activeWindowMs;
      }).length,
      totalRevenue: customers.reduce((sum, customer) => sum + customer.metrics.totalSpent, 0),
      totalOrders: customers.reduce((sum, customer) => sum + customer.metrics.orderCount, 0)
    };

    res.json({
      success: true,
      data: {
        customers,
        stats
      }
    });
  } catch (error) {
    console.error('Get customer CRM error:', error);
    res.status(500).json({
      error: 'Failed to load customers',
      message: error.message
    });
  }
};
