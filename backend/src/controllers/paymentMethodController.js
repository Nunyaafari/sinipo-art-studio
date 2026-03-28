import { v4 as uuidv4 } from 'uuid';

// In-memory storage for payment methods (replace with database in production)
let paymentMethods = new Map();

// Initialize with sample data
const initializePaymentMethods = () => {
  paymentMethods.set(1, [
    {
      id: 1,
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2027,
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ]);
};

initializePaymentMethods();

// Get user payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;
    const methods = paymentMethods.get(userId) || [];
    
    res.json({
      success: true,
      data: methods
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
};

// Add new payment method
export const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

    if (!type || !cardNumber || !expiryMonth || !expiryYear) {
      return res.status(400).json({
        error: 'Missing required payment method fields'
      });
    }

    const methods = paymentMethods.get(userId) || [];
    
    // Extract last 4 digits
    const last4 = cardNumber.slice(-4);
    
    // Determine card brand
    const brand = getCardBrand(cardNumber);
    
    // If this is the first method, make it default
    const isDefault = methods.length === 0;

    const newMethod = {
      id: Math.max(...methods.map(m => m.id), 0) + 1,
      type,
      last4,
      brand,
      expiryMonth: parseInt(expiryMonth),
      expiryYear: parseInt(expiryYear),
      cardholderName: cardholderName || '',
      isDefault,
      createdAt: new Date().toISOString()
    };

    methods.push(newMethod);
    paymentMethods.set(userId, methods);

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: newMethod
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      error: 'Failed to add payment method',
      message: error.message
    });
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const methods = paymentMethods.get(userId) || [];
    const methodIndex = methods.findIndex(m => m.id === parseInt(id));

    if (methodIndex === -1) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    // Remove default from all methods
    methods.forEach(m => m.isDefault = false);
    
    // Set new default
    methods[methodIndex].isDefault = true;
    paymentMethods.set(userId, methods);

    res.json({
      success: true,
      message: 'Default payment method updated',
      data: methods[methodIndex]
    });

  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      error: 'Failed to set default payment method',
      message: error.message
    });
  }
};

// Delete payment method
export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const methods = paymentMethods.get(userId) || [];
    const methodIndex = methods.findIndex(m => m.id === parseInt(id));

    if (methodIndex === -1) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    const deletedMethod = methods[methodIndex];
    methods.splice(methodIndex, 1);

    // If deleted method was default, make first remaining method default
    if (deletedMethod.isDefault && methods.length > 0) {
      methods[0].isDefault = true;
    }

    paymentMethods.set(userId, methods);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      error: 'Failed to delete payment method',
      message: error.message
    });
  }
};

// Get payment method statistics
export const getPaymentMethodStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const methods = paymentMethods.get(userId) || [];

    const stats = {
      total: methods.length,
      hasDefault: methods.some(m => m.isDefault),
      brands: [...new Set(methods.map(m => m.brand))],
      expiringSoon: methods.filter(m => {
        const expiry = new Date(m.expiryYear, m.expiryMonth - 1);
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        return expiry <= sixMonthsFromNow;
      }).length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get payment method stats error:', error);
    res.status(500).json({
      error: 'Failed to get payment method statistics',
      message: error.message
    });
  }
};

// Helper function to determine card brand
const getCardBrand = (cardNumber) => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(cleanNumber)) return 'Visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'American Express';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';
  if (/^35(?:2[89]|[3-8])/.test(cleanNumber)) return 'JCB';
  
  return 'Unknown';
};

// Export for use in other modules
export { paymentMethods };