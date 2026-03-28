import { getPaystackClient, hasPaystackConfig } from '../config/paystack.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateShippingCost, calculateTaxAmount, getPaymentSettings } from '../config/storefront.js';
import { getUserByEmail } from './authController.js';
import { calculateDiscountAmountForOrder, incrementDiscountUsage } from './admin/discountController.js';
import {
  createOrder,
  getOrderFromStorage,
  transitionOrderStatus
} from './orderController.js';
import { syncCustomerProfileFromCheckout } from './userController.js';
import { findCatalogProductById } from '../utils/catalog.js';
import {
  assertNonEmptyArray,
  assertObject,
  assertRequiredFields,
  assertValidEmail,
  createHttpError,
  normalizeString
} from '../utils/validation.js';

const frameOptions = new Set(['Gold', 'Black', 'Silver', 'White', 'Walnut']);
const roundCurrency = (value) => Math.round(value * 100) / 100;
const shouldUseMockPaymentMode = () => {
  return process.env.NODE_ENV !== 'production' && !hasPaystackConfig();
};

const sanitizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one order item is required');
  }

  return items.map((item) => {
    const productId = item?.artwork?.id ?? item?.productId;
    const product = findCatalogProductById(productId);

    if (!product) {
      throw new Error(`Product ${productId} was not found`);
    }

    const requestedQuantity = Number.parseInt(item?.quantity ?? 1, 10);
    if (Number.isNaN(requestedQuantity) || requestedQuantity < 1) {
      throw new Error(`Invalid quantity for ${product.title}`);
    }

    if (product.inStock === false || (product.stockQuantity ?? 0) < requestedQuantity) {
      throw new Error(`${product.title} does not have enough stock available`);
    }

    const requestedVariantId =
      typeof item?.artwork?.selectedVariantId === 'string'
        ? item.artwork.selectedVariantId
        : typeof item?.selectedVariantId === 'string'
          ? item.selectedVariantId
          : typeof item?.variantId === 'string'
            ? item.variantId
            : '';

    const requestedFrame = typeof item?.artwork?.frameColor === 'string'
      ? item.artwork.frameColor
      : typeof item?.frameColor === 'string'
        ? item.frameColor
        : '';
    const safeFrame = product.productType === 'artwork' && frameOptions.has(requestedFrame)
      ? requestedFrame
      : product.productType === 'artwork'
        ? product.frameColor || 'Gold'
        : product.frameColor || 'N/A';

    const selectedVariant =
      product.productType === 'fashion' && Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.find((variant) => variant.id === requestedVariantId)
          || product.variants.find((variant) => variant.isDefault)
          || product.variants[0]
        : null;

    if (product.productType === 'fashion' && selectedVariant && selectedVariant.stockQuantity < requestedQuantity) {
      throw new Error(`${product.title} does not have enough stock available`);
    }

    return {
      artwork: {
        ...product,
        frameColor: safeFrame,
        selectedVariantId: selectedVariant?.id || null,
        clothingSize: selectedVariant?.size || product.clothingSize,
        color: selectedVariant?.color || product.color,
        material: selectedVariant?.material || product.material,
        sku: selectedVariant?.sku || product.sku,
        stockQuantity: selectedVariant?.stockQuantity ?? product.stockQuantity,
        price: selectedVariant?.price ?? product.price
      },
      quantity: requestedQuantity
    };
  });
};

const assertOrderAccess = (order, requesterUserId) => {
  if (order?.userId && requesterUserId && order.userId !== requesterUserId) {
    throw new Error('You are not authorized to access this order');
  }

  if (order?.userId && !requesterUserId) {
    throw new Error('Authentication required to access this order');
  }
};

const validateCheckoutRequest = (payload) => {
  const normalizedEmail = assertValidEmail(payload?.email, 'A valid checkout email is required');
  assertNonEmptyArray(payload?.items, 'items');
  const customerInfo = assertObject(payload?.customerInfo, 'customerInfo');

  assertRequiredFields(customerInfo, [
    { key: 'firstName', label: 'first name' },
    { key: 'lastName', label: 'last name' },
    { key: 'phone', label: 'phone' },
    { key: 'address', label: 'address' },
    { key: 'city', label: 'city' },
    { key: 'country', label: 'country' }
  ]);

  const normalizedCustomerInfo = {
    firstName: normalizeString(customerInfo.firstName),
    lastName: normalizeString(customerInfo.lastName),
    email: normalizedEmail,
    phone: normalizeString(customerInfo.phone),
    address: normalizeString(customerInfo.address),
    city: normalizeString(customerInfo.city),
    country: normalizeString(customerInfo.country)
  };

  if (!normalizedCustomerInfo.email) {
    throw createHttpError(400, 'A valid checkout email is required');
  }

  return {
    normalizedEmail,
    normalizedCustomerInfo
  };
};

export const initializePayment = async (req, res) => {
  try {
    const {
      items,
      discountCode = null,
    } = req.body;
    const { normalizedEmail, normalizedCustomerInfo } = validateCheckoutRequest(req.body);

    const sanitizedItems = sanitizeOrderItems(items);
    const subtotal = roundCurrency(
      sanitizedItems.reduce((sum, item) => sum + item.artwork.price * item.quantity, 0)
    );
    const shipping = roundCurrency(calculateShippingCost(subtotal));
    const validatedDiscount = discountCode
      ? calculateDiscountAmountForOrder(discountCode, subtotal)
      : null;
    const discountAmount = validatedDiscount?.discountAmount || 0;
    const discountedSubtotal = roundCurrency(Math.max(subtotal - discountAmount, 0));
    const taxAmount = roundCurrency(calculateTaxAmount(discountedSubtotal));
    const totalAmount = roundCurrency(Math.max(discountedSubtotal + shipping + taxAmount, 0));
    const isMockPaymentMode = shouldUseMockPaymentMode();

    // Generate unique reference
    const reference = `sinipo_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = Math.round(totalAmount * 100);
    const authenticatedUserId = req.user?.userId || null;
    const matchedUser = authenticatedUserId ? null : getUserByEmail(normalizedEmail);
    const userId = authenticatedUserId || matchedUser?.id || null;

    const baseOrder = {
      reference,
      userId,
      email: normalizedEmail,
      amount: totalAmount,
      subtotal,
      shipping,
      taxAmount,
      items: sanitizedItems,
      customerInfo: normalizedCustomerInfo,
      discountCode: validatedDiscount?.code || null,
      discountAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMode: isMockPaymentMode ? 'mock' : 'paystack'
    };

    if (isMockPaymentMode) {
      if (userId) {
        syncCustomerProfileFromCheckout({ userId, customerInfo: normalizedCustomerInfo });
      }

      createOrder({
        ...baseOrder,
        paystackData: null
      });

      return res.json({
        success: true,
        data: {
          reference,
          authorization_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback?reference=${reference}`,
          access_code: null,
          mode: 'mock'
        },
        message: 'Payment initialized in local test mode'
      });
    }

    // Initialize payment with Paystack
    const paymentData = {
      email: normalizedEmail,
      amount: amountInKobo,
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: `${normalizedCustomerInfo.firstName} ${normalizedCustomerInfo.lastName}`
          },
          {
            display_name: "Phone",
            variable_name: "phone",
            value: normalizedCustomerInfo.phone
          },
          {
            display_name: "Items",
            variable_name: "items",
            value: JSON.stringify(sanitizedItems.map(item => ({
              id: item.artwork.id,
              title: item.artwork.title,
              quantity: item.quantity,
              price: item.artwork.price
            })))
          },
          {
            display_name: "Tax",
            variable_name: "tax_amount",
            value: String(taxAmount)
          }
        ]
      }
    };

    const paystack = getPaystackClient();

    if (!paystack) {
      throw new Error('Live payment credentials are not configured');
    }

    const response = await paystack.transaction.initialize(paymentData);

    if (!response.status) {
      throw new Error(response.message || 'Failed to initialize payment');
    }

    // Store order information
      if (userId) {
      syncCustomerProfileFromCheckout({ userId, customerInfo: normalizedCustomerInfo });
    }

    createOrder({
      ...baseOrder,
      paystackData: response.data
    });

    res.json({
      success: true,
      data: {
        reference,
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code
      }
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    const knownClientError = [
      'At least one order item is required',
      'Invalid discount code',
      'Discount code is expired or not yet valid',
      'Discount code usage limit reached'
    ].includes(error.message)
      || error.message?.includes('must include at least one item')
      || error.message?.includes('must be a valid object')
      || error.message?.startsWith('Product ')
      || error.message?.includes('does not have enough stock available')
      || error.message?.includes('Minimum order amount')
      || error.message?.includes('Invalid quantity')
      || error.statusCode === 400;

    res.status(knownClientError ? (error.statusCode || 400) : 500).json({
      error: knownClientError ? error.message : 'Failed to initialize payment',
      message: error.message
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        error: 'Payment reference is required'
      });
    }

    const order = getOrderFromStorage(reference);
    assertOrderAccess(order, req.user?.userId || null);
    const isMockPaymentMode = shouldUseMockPaymentMode();

    if (isMockPaymentMode) {
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      const paidAt = new Date().toISOString();
      const updatedOrder = transitionOrderStatus(reference, 'paid', {
        paidAt,
        ...(order.discountCode && !order.discountAppliedAt
          ? {
              discountAppliedAt: paidAt,
              discountUsage: incrementDiscountUsage(order.discountCode)
            }
          : {}),
        updatedAt: paidAt,
        paystackResponse: {
          status: 'success',
          paid_at: paidAt,
          reference
        }
      });

      return res.json({
        success: true,
        data: {
          reference,
          status: 'success',
          amount: updatedOrder.amount,
          paid_at: paidAt,
          customer: {
            email: updatedOrder.email
          },
          order: updatedOrder
        }
      });
    }

    // Verify payment with Paystack
    const paystack = getPaystackClient();

    if (!paystack) {
      throw new Error('Live payment credentials are not configured');
    }

    const response = await paystack.transaction.verify(reference);

    if (!response.status) {
      throw new Error(response.message || 'Payment verification failed');
    }

    const paymentStatus = response.data.status;

    if (order) {
      // Update order status
      const successfulPayment = paymentStatus === 'success';
      const paidAt = response.data.paid_at || new Date().toISOString();
      const discountUsageUpdate = successfulPayment && order.discountCode && !order.discountAppliedAt
        ? {
            discountAppliedAt: paidAt,
            discountUsage: incrementDiscountUsage(order.discountCode)
          }
        : {};

      if (successfulPayment) {
        transitionOrderStatus(reference, 'paid', {
          paidAt,
          paystackResponse: response.data,
          ...discountUsageUpdate,
          updatedAt: new Date().toISOString()
        });
      } else {
        transitionOrderStatus(reference, 'failed', {
          paystackResponse: response.data,
          updatedAt: new Date().toISOString()
        });
      }
    }

    const updatedOrder = getOrderFromStorage(reference);

    res.json({
      success: true,
      data: {
        reference,
        status: paymentStatus,
        amount: response.data.amount / 100, // Convert back from kobo
        paid_at: response.data.paid_at,
        customer: response.data.customer,
        order: updatedOrder || null
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    const statusCode = [
      'Authentication required to access this order',
      'You are not authorized to access this order'
    ].includes(error.message)
      ? (error.message.startsWith('Authentication') ? 401 : 403)
      : error.message?.includes('does not have enough stock available')
        ? 409
      : 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to verify payment' : error.message,
      message: error.message
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        error: 'Payment reference is required'
      });
    }

    const order = getOrderFromStorage(reference);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    assertOrderAccess(order, req.user?.userId || null);

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    const statusCode = [
      'Authentication required to access this order',
      'You are not authorized to access this order'
    ].includes(error.message)
      ? (error.message.startsWith('Authentication') ? 401 : 403)
      : 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to get payment status' : error.message,
      message: error.message
    });
  }
};
