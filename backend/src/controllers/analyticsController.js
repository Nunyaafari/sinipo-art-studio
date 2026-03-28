import { getAllOrdersFromStorage } from './orderController.js';
import { getCatalogProductsData, getInventoryMovementData, getLowStockCatalogProducts } from '../utils/catalog.js';

const REVENUE_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered']);
const dateToMs = (value) => new Date(value).getTime();
const isWithinRange = (value, start, end = new Date()) => {
  const timestamp = dateToMs(value);
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
};

const normalizeDateBoundary = (value, boundary = 'start') => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T${boundary === 'end' ? '23:59:59.999' : '00:00:00.000'}`
    : trimmed;
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getOrdersForRange = (startDate, endDate = new Date()) =>
  getAllOrdersFromStorage().filter((order) => isWithinRange(order.createdAt, startDate, endDate));

const getRevenueOrders = (orders) =>
  orders.filter((order) => REVENUE_STATUSES.has(order.status));

// In-memory storage for analytics data
let analyticsData = {
  pageViews: new Map(),
  userSessions: new Map(),
  conversions: [],
  salesData: [],
  userBehavior: new Map(),
  abTests: new Map(),
  events: []
};

// Track page view
export const trackPageView = async (req, res) => {
  try {
    const { page, userId, sessionId, timestamp, userAgent, referrer } = req.body;

    if (!page) {
      return res.status(400).json({
        error: 'Page URL is required'
      });
    }

    const pageView = {
      page,
      userId: userId || 'anonymous',
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || req.get('User-Agent'),
      referrer: referrer || req.get('Referer'),
      ip: req.ip
    };

    // Store page view
    const pageViews = analyticsData.pageViews.get(page) || [];
    pageViews.push(pageView);
    analyticsData.pageViews.set(page, pageViews);

    // Track user session
    if (userId) {
      const userSessions = analyticsData.userSessions.get(userId) || [];
      userSessions.push({
        page,
        timestamp: pageView.timestamp,
        sessionId
      });
      analyticsData.userSessions.set(userId, userSessions);
    }

    res.json({
      success: true,
      message: 'Page view tracked'
    });

  } catch (error) {
    console.error('Track page view error:', error);
    res.status(500).json({
      error: 'Failed to track page view',
      message: error.message
    });
  }
};

// Track conversion event
export const trackConversion = async (req, res) => {
  try {
    const { 
      type, 
      value, 
      userId, 
      productId, 
      orderId, 
      metadata 
    } = req.body;

    if (!type) {
      return res.status(400).json({
        error: 'Conversion type is required'
      });
    }

    const conversion = {
      id: Date.now().toString(),
      type, // 'purchase', 'signup', 'wishlist', 'review', etc.
      value: value || 0,
      userId: userId || 'anonymous',
      productId,
      orderId,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      ip: req.ip
    };

    analyticsData.conversions.push(conversion);

    // Track user behavior
    if (userId) {
      const userBehavior = analyticsData.userBehavior.get(userId) || {
        conversions: [],
        pageViews: 0,
        lastActive: null
      };
      userBehavior.conversions.push(conversion);
      userBehavior.lastActive = new Date().toISOString();
      analyticsData.userBehavior.set(userId, userBehavior);
    }

    res.json({
      success: true,
      message: 'Conversion tracked',
      data: conversion
    });

  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({
      error: 'Failed to track conversion',
      message: error.message
    });
  }
};

// Track custom event
export const trackEvent = async (req, res) => {
  try {
    const { 
      category, 
      action, 
      label, 
      value, 
      userId, 
      metadata 
    } = req.body;

    if (!category || !action) {
      return res.status(400).json({
        error: 'Event category and action are required'
      });
    }

    const event = {
      id: Date.now().toString(),
      category, // 'engagement', 'ecommerce', 'social', etc.
      action,   // 'click', 'view', 'share', 'add_to_cart', etc.
      label,
      value: value || 0,
      userId: userId || 'anonymous',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      ip: req.ip
    };

    analyticsData.events.push(event);

    res.json({
      success: true,
      message: 'Event tracked',
      data: event
    });

  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: error.message
    });
  }
};

// Get analytics dashboard data
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { period = '7d', startDate: requestedStartDate, endDate: requestedEndDate } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = normalizeDateBoundary(requestedStartDate, 'start');
    const explicitEndDate = normalizeDateBoundary(requestedEndDate, 'end');
    const endDate = explicitEndDate || now;
    
    if (!startDate) {
      switch (period) {
        case '24h':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (startDate > endDate) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }

    // Filter data by period
    const filteredConversions = analyticsData.conversions.filter(
      c => isWithinRange(c.timestamp, startDate, endDate)
    );
    
    const filteredEvents = analyticsData.events.filter(
      e => isWithinRange(e.timestamp, startDate, endDate)
    );
    const filteredOrders = getOrdersForRange(startDate, endDate);
    const revenueOrders = getRevenueOrders(filteredOrders);
    const inventoryMovements = getInventoryMovementData().filter((movement) =>
      isWithinRange(movement.createdAt, startDate, endDate)
    );

    // Calculate metrics
    const totalPageViews = Array.from(analyticsData.pageViews.values())
      .flat()
      .filter(pv => isWithinRange(pv.timestamp, startDate, endDate)).length;

    const uniqueVisitors = new Set(
      Array.from(analyticsData.pageViews.values())
        .flat()
        .filter(pv => isWithinRange(pv.timestamp, startDate, endDate))
        .map(pv => pv.sessionId)
    ).size;

    const totalConversions = filteredConversions.length;
    const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const revenueByStatus = filteredOrders.reduce((summary, order) => {
      summary[order.status] = (summary[order.status] || 0) + (order.amount || 0);
      return summary;
    }, {});

    const conversionRate = uniqueVisitors > 0 
      ? ((totalConversions / uniqueVisitors) * 100).toFixed(2)
      : 0;

    const topProductsMap = {};
    revenueOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const productId = item?.artwork?.id ?? item?.productId;
        const title = item?.artwork?.title || item?.title || 'Untitled Product';
        const revenue = (item?.artwork?.price || item?.price || 0) * (item?.quantity || 0);

        if (!productId) {
          return;
        }

        if (!topProductsMap[productId]) {
          topProductsMap[productId] = {
            productId,
            title,
            orders: 0,
            unitsSold: 0,
            revenue: 0
          };
        }

        topProductsMap[productId].orders += 1;
        topProductsMap[productId].unitsSold += item?.quantity || 0;
        topProductsMap[productId].revenue += revenue;
      });
    });

    const topProducts = Object.values(topProductsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top pages
    const pageViewCounts = {};
    Array.from(analyticsData.pageViews.entries()).forEach(([page, views]) => {
      const filteredViews = views.filter(pv => isWithinRange(pv.timestamp, startDate, endDate));
      if (filteredViews.length > 0) {
        pageViewCounts[page] = filteredViews.length;
      }
    });

    const topPages = Object.entries(pageViewCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Conversion types
    const conversionTypes = {};
    filteredConversions.forEach(c => {
      conversionTypes[c.type] = (conversionTypes[c.type] || 0) + 1;
    });

    // Recent activity
    const recentActivity = [
      ...filteredOrders.slice(-10).map((order) => ({
        type: 'order',
        description: `Order ${order.reference} moved to ${order.status}`,
        value: order.amount || 0,
        timestamp: order.updatedAt || order.createdAt
      })),
      ...inventoryMovements.slice(-10).map((movement) => ({
        type: 'inventory',
        description: `${movement.productTitle}${movement.variantLabel ? ` (${movement.variantLabel})` : ''} ${movement.quantityDelta > 0 ? 'restocked' : 'reduced'}`,
        value: 0,
        timestamp: movement.createdAt
      })),
      ...filteredConversions.slice(-10).map(c => ({
        type: 'conversion',
        description: `${c.type} conversion${c.productId ? ` for product ${c.productId}` : ''}`,
        value: c.value,
        timestamp: c.timestamp
      })),
      ...filteredEvents.slice(-10).map(e => ({
        type: 'event',
        description: `${e.category}: ${e.action}${e.label ? ` - ${e.label}` : ''}`,
        value: e.value,
        timestamp: e.timestamp
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    const dashboard = {
      period,
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalPageViews,
        uniqueVisitors,
        totalConversions,
        totalRevenue,
        conversionRate: parseFloat(conversionRate),
        paidRevenue: revenueByStatus.paid || 0,
        deliveredRevenue: revenueByStatus.delivered || 0,
        lowStockProducts: getLowStockCatalogProducts().length,
        stockMovements: inventoryMovements.length
      },
      topPages,
      topProducts,
      conversionTypes,
      revenueByStatus,
      inventorySnapshot: {
        totalProducts: getCatalogProductsData().length,
        lowStockProducts: getLowStockCatalogProducts().slice(0, 8),
        recentMovements: inventoryMovements
          .slice()
          .sort((a, b) => dateToMs(b.createdAt) - dateToMs(a.createdAt))
          .slice(0, 10)
      },
      recentActivity,
      totalEvents: filteredEvents.length
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Get analytics dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get analytics dashboard',
      message: error.message
    });
  }
};

// Get sales report
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const end = normalizeDateBoundary(endDate, 'end') || new Date();
    const start = normalizeDateBoundary(startDate, 'start') || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (start > end) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }

    const purchases = getRevenueOrders(getOrdersForRange(start, end));

    // Group by time period
    const groupedData = {};
    purchases.forEach(purchase => {
      let key;
      const date = new Date(purchase.createdAt);
      
      switch (groupBy) {
        case 'hour':
          key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
          break;
        case 'day':
          key = date.toISOString().slice(0, 10); // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = date.toISOString().slice(0, 7); // YYYY-MM
          break;
        default:
          key = date.toISOString().slice(0, 10);
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          sales: 0,
          revenue: 0,
          orders: 0
        };
      }

      groupedData[key].sales += 1;
      groupedData[key].revenue += purchase.amount || 0;
      groupedData[key].orders += 1;
    });

    // Convert to array and sort
    const salesReport = Object.values(groupedData)
      .sort((a, b) => new Date(a.period) - new Date(b.period));

    // Calculate totals
    const totals = {
      totalSales: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + (p.amount || 0), 0),
      averageOrderValue: purchases.length > 0 
        ? purchases.reduce((sum, p) => sum + (p.amount || 0), 0) / purchases.length 
        : 0
    };

    const topProductsMap = {};
    purchases.forEach((order) => {
      order.items?.forEach((item) => {
        const key = item?.artwork?.id ?? item?.productId;
        const title = item?.artwork?.title || item?.title || 'Untitled Product';
        if (!key) {
          return;
        }

        if (!topProductsMap[key]) {
          topProductsMap[key] = {
            productId: key,
            title,
            unitsSold: 0,
            revenue: 0
          };
        }

        topProductsMap[key].unitsSold += item?.quantity || 0;
        topProductsMap[key].revenue += (item?.artwork?.price || item?.price || 0) * (item?.quantity || 0);
      });
    });

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        groupBy,
        salesReport,
        totals,
        topProducts: Object.values(topProductsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
        stockMovement: getInventoryMovementData()
          .filter((movement) => isWithinRange(movement.createdAt, start, end))
          .slice()
          .sort((a, b) => dateToMs(b.createdAt) - dateToMs(a.createdAt))
          .slice(0, 20)
      }
    });

  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      error: 'Failed to get sales report',
      message: error.message
    });
  }
};

// Create A/B test
export const createABTest = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      variants, 
      trafficSplit, 
      startDate, 
      endDate 
    } = req.body;

    if (!name || !variants || variants.length < 2) {
      return res.status(400).json({
        error: 'Test name and at least 2 variants are required'
      });
    }

    const testId = `test_${Date.now()}`;
    
    const abTest = {
      id: testId,
      name,
      description: description || '',
      variants: variants.map((variant, index) => ({
        id: `variant_${index}`,
        name: variant.name,
        description: variant.description || '',
        weight: trafficSplit ? trafficSplit[index] : Math.floor(100 / variants.length),
        views: 0,
        conversions: 0
      })),
      status: 'active',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      totalParticipants: 0
    };

    analyticsData.abTests.set(testId, abTest);

    res.status(201).json({
      success: true,
      message: 'A/B test created successfully',
      data: abTest
    });

  } catch (error) {
    console.error('Create A/B test error:', error);
    res.status(500).json({
      error: 'Failed to create A/B test',
      message: error.message
    });
  }
};

// Get A/B test variant for user
export const getABTestVariant = async (req, res) => {
  try {
    const { testId } = req.params;
    const { userId } = req.query;

    const test = analyticsData.abTests.get(testId);
    
    if (!test || test.status !== 'active') {
      return res.status(404).json({
        error: 'A/B test not found or inactive'
      });
    }

    // Check if test is still valid
    const now = new Date();
    if (now < new Date(test.startDate) || now > new Date(test.endDate)) {
      return res.status(400).json({
        error: 'A/B test is not currently active'
      });
    }

    // Simple variant selection based on user ID hash
    let variantIndex = 0;
    if (userId) {
      const hash = userId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      variantIndex = Math.abs(hash) % test.variants.length;
    } else {
      variantIndex = Math.floor(Math.random() * test.variants.length);
    }

    const selectedVariant = test.variants[variantIndex];
    
    // Update view count
    selectedVariant.views += 1;
    test.totalParticipants += 1;

    res.json({
      success: true,
      data: {
        testId,
        variant: selectedVariant,
        testName: test.name
      }
    });

  } catch (error) {
    console.error('Get A/B test variant error:', error);
    res.status(500).json({
      error: 'Failed to get A/B test variant',
      message: error.message
    });
  }
};

// Track A/B test conversion
export const trackABTestConversion = async (req, res) => {
  try {
    const { testId, variantId, userId, value } = req.body;

    const test = analyticsData.abTests.get(testId);
    
    if (!test) {
      return res.status(404).json({
        error: 'A/B test not found'
      });
    }

    const variant = test.variants.find(v => v.id === variantId);
    
    if (!variant) {
      return res.status(404).json({
        error: 'Variant not found'
      });
    }

    // Update conversion count
    variant.conversions += 1;

    // Track as conversion event
    await trackConversion({
      body: {
        type: 'ab_test_conversion',
        value: value || 0,
        userId,
        metadata: {
          testId,
          variantId,
          testName: test.name,
          variantName: variant.name
        }
      }
    }, { json: () => {} });

    res.json({
      success: true,
      message: 'A/B test conversion tracked'
    });

  } catch (error) {
    console.error('Track A/B test conversion error:', error);
    res.status(500).json({
      error: 'Failed to track A/B test conversion',
      message: error.message
    });
  }
};

// Get A/B test results
export const getABTestResults = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = analyticsData.abTests.get(testId);
    
    if (!test) {
      return res.status(404).json({
        error: 'A/B test not found'
      });
    }

    // Calculate results
    const results = test.variants.map(variant => ({
      ...variant,
      conversionRate: variant.views > 0 
        ? ((variant.conversions / variant.views) * 100).toFixed(2)
        : 0,
      confidence: calculateConfidence(variant.views, variant.conversions)
    }));

    // Find winner
    const winner = results.reduce((best, current) => 
      parseFloat(current.conversionRate) > parseFloat(best.conversionRate) ? current : best
    );

    res.json({
      success: true,
      data: {
        test,
        results,
        winner: winner.conversionRate > 0 ? winner : null,
        totalParticipants: test.totalParticipants
      }
    });

  } catch (error) {
    console.error('Get A/B test results error:', error);
    res.status(500).json({
      error: 'Failed to get A/B test results',
      message: error.message
    });
  }
};

// Helper function to calculate confidence (simplified)
const calculateConfidence = (views, conversions) => {
  if (views < 30) return 'low';
  if (views < 100) return 'medium';
  if (conversions / views > 0.1) return 'high';
  return 'medium';
};

// Get user behavior analytics
export const getUserBehavior = async (req, res) => {
  try {
    const { userId } = req.params;

    const userBehavior = analyticsData.userBehavior.get(userId);
    
    if (!userBehavior) {
      return res.status(404).json({
        error: 'User behavior data not found'
      });
    }

    const userSessions = analyticsData.userSessions.get(userId) || [];
    const userConversions = analyticsData.conversions.filter(c => c.userId === userId);

    const behaviorAnalytics = {
      userId,
      totalSessions: new Set(userSessions.map(s => s.sessionId)).size,
      totalPageViews: userSessions.length,
      totalConversions: userConversions.length,
      lastActive: userBehavior.lastActive,
      conversionTypes: userConversions.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {}),
      averageSessionDuration: calculateAverageSessionDuration(userSessions)
    };

    res.json({
      success: true,
      data: behaviorAnalytics
    });

  } catch (error) {
    console.error('Get user behavior error:', error);
    res.status(500).json({
      error: 'Failed to get user behavior',
      message: error.message
    });
  }
};

// Helper function to calculate average session duration
const calculateAverageSessionDuration = (sessions) => {
  if (sessions.length < 2) return 0;
  
  const sessionGroups = {};
  sessions.forEach(session => {
    if (!sessionGroups[session.sessionId]) {
      sessionGroups[session.sessionId] = [];
    }
    sessionGroups[session.sessionId].push(new Date(session.timestamp));
  });

  let totalDuration = 0;
  let sessionCount = 0;

  Object.values(sessionGroups).forEach(timestamps => {
    if (timestamps.length > 1) {
      timestamps.sort((a, b) => a - b);
      const duration = timestamps[timestamps.length - 1] - timestamps[0];
      totalDuration += duration;
      sessionCount += 1;
    }
  });

  return sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000) : 0; // in seconds
};

// Export analytics data (for admin)
export const exportAnalyticsData = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    let data;

    switch (type) {
      case 'conversions':
        data = analyticsData.conversions.filter(
          c => new Date(c.timestamp) >= start && new Date(c.timestamp) <= end
        );
        break;
      case 'events':
        data = analyticsData.events.filter(
          e => new Date(e.timestamp) >= start && new Date(e.timestamp) <= end
        );
        break;
      case 'pageViews':
        data = Array.from(analyticsData.pageViews.entries()).map(([page, views]) => ({
          page,
          views: views.filter(v => new Date(v.timestamp) >= start && new Date(v.timestamp) <= end)
        })).filter(item => item.views.length > 0);
        break;
      default:
        data = {
          conversions: analyticsData.conversions,
          events: analyticsData.events,
          pageViews: Object.fromEntries(analyticsData.pageViews)
        };
    }

    res.json({
      success: true,
      data,
      exportedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export analytics data error:', error);
    res.status(500).json({
      error: 'Failed to export analytics data',
      message: error.message
    });
  }
};

// Export for use in other modules
export { analyticsData };
