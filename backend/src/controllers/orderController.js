import { getOrdersState, savePersistentState } from '../storage/persistentState.js';
import { applyInventoryAdjustmentToOrder } from '../utils/catalog.js';
import { recordAdminAudit } from '../utils/adminAudit.js';

const orders = getOrdersState();
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'failed',
  'cancelled',
  'refunded'
];
const ACTIVE_INVENTORY_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered']);
const lifecycleTimestampFields = {
  paid: 'paidAt',
  processing: 'processingAt',
  shipped: 'shippedAt',
  delivered: 'deliveredAt',
  failed: 'failedAt',
  cancelled: 'cancelledAt',
  refunded: 'refundedAt'
};

export const normalizeOrderStatus = (status) => {
  if (status === 'completed') {
    return 'delivered';
  }

  return status;
};

export const isValidOrderStatus = (status) => ORDER_STATUSES.includes(normalizeOrderStatus(status));
const sanitizeOrderStatus = (status) => (isValidOrderStatus(status) ? normalizeOrderStatus(status) : 'pending');

const normalizeOrderRecord = (order) => {
  if (!order) {
    return null;
  }

  return {
    ...order,
    status: sanitizeOrderStatus(order.status)
  };
};

const hasAllocatedInventory = (order) => Boolean(order.inventoryAdjustedAt && !order.inventoryRestoredAt);

const transitionOrderInventory = (order, nextStatus, timestamp) => {
  const shouldAllocateInventory = ACTIVE_INVENTORY_STATUSES.has(nextStatus);
  const inventoryAlreadyAllocated = hasAllocatedInventory(order);

  if (shouldAllocateInventory && !inventoryAlreadyAllocated) {
    const { order: inventoryAdjustedOrder } = applyInventoryAdjustmentToOrder(order, 'deduct', {
      reason: 'order_allocation',
      reference: order.reference
    });

    return {
      ...inventoryAdjustedOrder,
      inventoryAdjustedAt: timestamp,
      inventoryRestoredAt: null
    };
  }

  if (!shouldAllocateInventory && inventoryAlreadyAllocated) {
    const { order: inventoryRestoredOrder } = applyInventoryAdjustmentToOrder(order, 'restore', {
      reason: 'order_restore',
      reference: order.reference
    });

    return {
      ...inventoryRestoredOrder,
      inventoryRestoredAt: timestamp
    };
  }

  return order;
};

export const getOrder = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        error: 'Order reference is required'
      });
    }

    const order = normalizeOrderRecord(orders[reference]);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Failed to get order',
      message: error.message
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const allOrders = Object.values(orders).map((order) => normalizeOrderRecord(order));
    
    // Sort by creation date (newest first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: allOrders,
      count: allOrders.length
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message
    });
  }
};

export const getAllOrdersFromStorage = () => {
  const allOrders = Object.values(orders).map((order) => normalizeOrderRecord(order));
  allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return allOrders;
};

export const getOrdersForUser = ({ userId, email }) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  return getAllOrdersFromStorage().filter((order) => {
    if (userId && order.userId === userId) {
      return true;
    }

    return normalizedEmail && typeof order.email === 'string'
      ? order.email.trim().toLowerCase() === normalizedEmail
      : false;
  });
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const { status } = req.body;

    if (!reference) {
      return res.status(400).json({
        error: 'Order reference is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    const normalizedStatus = normalizeOrderStatus(status);
    if (!isValidOrderStatus(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`
      });
    }

    const order = orders[reference];

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    const previousStatus = order.status;
    const updatedOrder = transitionOrderStatus(reference, normalizedStatus);
    recordAdminAudit(req, {
      action: 'order.status.update',
      targetType: 'order',
      targetId: reference,
      summary: `Updated order ${reference} from ${previousStatus} to ${normalizedStatus}`,
      changes: {
        before: { status: previousStatus },
        after: { status: updatedOrder?.status || normalizedStatus }
      }
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${normalizedStatus}`
    });

  } catch (error) {
    console.error('Update order status error:', error);
    const statusCode = error.message?.startsWith('Invalid status')
      ? 400
      : error.message?.includes('does not have enough stock available')
        ? 409
        : 500;

    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to update order status' : error.message,
      message: error.message
    });
  }
};

// Helper function to create order (used by payment controller)
export const createOrder = (orderData) => {
  orders[orderData.reference] = {
    ...orderData,
    status: sanitizeOrderStatus(orderData.status)
  };
  savePersistentState();
  return normalizeOrderRecord(orders[orderData.reference]);
};

// Helper function to get order (used by payment controller)
export const getOrderFromStorage = (reference) => {
  return normalizeOrderRecord(orders[reference]);
};

// Helper function to update order (used by payment controller)
export const updateOrderInStorage = (reference, updates) => {
  const order = orders[reference];
  if (order) {
    const updatedOrder = {
      ...order,
      ...updates,
      status: updates.status ? sanitizeOrderStatus(updates.status) : sanitizeOrderStatus(order.status)
    };
    orders[reference] = updatedOrder;
    savePersistentState();
    return normalizeOrderRecord(updatedOrder);
  }
  return null;
};

export const transitionOrderStatus = (reference, nextStatus, updates = {}) => {
  const order = orders[reference];

  if (!order) {
    return null;
  }

  if (!isValidOrderStatus(nextStatus)) {
    throw new Error(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`);
  }

  const normalizedStatus = normalizeOrderStatus(nextStatus);
  const timestamp = updates.updatedAt || new Date().toISOString();
  let updatedOrder = {
    ...order,
    ...updates,
    status: normalizedStatus,
    updatedAt: timestamp
  };

  updatedOrder = transitionOrderInventory(updatedOrder, normalizedStatus, timestamp);

  const lifecycleField = lifecycleTimestampFields[normalizedStatus];
  if (lifecycleField && !updatedOrder[lifecycleField]) {
    updatedOrder[lifecycleField] = timestamp;
  }

  orders[reference] = updatedOrder;
  savePersistentState();
  return normalizeOrderRecord(updatedOrder);
};
