import { getDiscountCodesState, savePersistentState } from '../../storage/persistentState.js';
import {
  assertRequiredFields,
  createHttpError,
  hasValue,
  normalizeString,
  parseNumberField
} from '../../utils/validation.js';
import { recordAdminAudit } from '../../utils/adminAudit.js';

const discountCodes = getDiscountCodesState();
export const getDiscountCodesData = () => [...discountCodes];

const resolveDiscountCode = (code) => {
  if (!code) {
    return null;
  }

  return discountCodes.find((discountCode) =>
    discountCode.code.toUpperCase() === code.toUpperCase() && discountCode.isActive
  ) || null;
};

export const calculateDiscountAmountForOrder = (code, orderAmount) => {
  const discountCode = resolveDiscountCode(code);

  if (!discountCode) {
    throw new Error('Invalid discount code');
  }

  const now = new Date();
  const validFrom = new Date(discountCode.validFrom);
  const validUntil = new Date(discountCode.validUntil);

  if (now < validFrom || now > validUntil) {
    throw new Error('Discount code is expired or not yet valid');
  }

  if (discountCode.usageLimit && discountCode.usedCount >= discountCode.usageLimit) {
    throw new Error('Discount code usage limit reached');
  }

  if (orderAmount < discountCode.minOrderAmount) {
    throw new Error(`Minimum order amount of $${discountCode.minOrderAmount} required`);
  }

  let discountAmount;
  if (discountCode.type === 'percentage') {
    discountAmount = (orderAmount * discountCode.value) / 100;
    discountAmount = Math.min(discountAmount, discountCode.maxDiscount);
  } else {
    discountAmount = Math.min(discountCode.value, discountCode.maxDiscount);
  }

  return {
    code: discountCode.code,
    type: discountCode.type,
    value: discountCode.value,
    discountAmount: Math.round(discountAmount * 100) / 100,
    minOrderAmount: discountCode.minOrderAmount,
    maxDiscount: discountCode.maxDiscount
  };
};

export const incrementDiscountUsage = (code) => {
  const discountCodeIndex = discountCodes.findIndex((discountCode) =>
    discountCode.code.toUpperCase() === code.toUpperCase() && discountCode.isActive
  );

  if (discountCodeIndex === -1) {
    return null;
  }

  discountCodes[discountCodeIndex].usedCount += 1;
  discountCodes[discountCodeIndex].updatedAt = new Date().toISOString();
  savePersistentState();
  return discountCodes[discountCodeIndex];
};

// Get all discount codes
export const getAllDiscountCodes = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    
    let filteredCodes = [...discountCodes];

    // Apply filters
    if (isActive !== undefined) {
      filteredCodes = filteredCodes.filter(code => 
        isActive === 'true' ? code.isActive : !code.isActive
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCodes = filteredCodes.filter(code => 
        code.code.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: filteredCodes,
      count: filteredCodes.length
    });

  } catch (error) {
    console.error('Get all discount codes error:', error);
    res.status(500).json({
      error: 'Failed to get discount codes',
      message: error.message
    });
  }
};

// Get discount code by ID
export const getDiscountCodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const discountCode = discountCodes.find(dc => dc.id === parseInt(id));

    if (!discountCode) {
      return res.status(404).json({
        error: 'Discount code not found'
      });
    }

    res.json({
      success: true,
      data: discountCode
    });

  } catch (error) {
    console.error('Get discount code by ID error:', error);
    res.status(500).json({
      error: 'Failed to get discount code',
      message: error.message
    });
  }
};

// Create new discount code
export const createDiscountCode = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      validFrom,
      validUntil
    } = req.body;

    assertRequiredFields(req.body, [
      { key: 'code', label: 'code' },
      { key: 'type', label: 'type' },
      { key: 'value', label: 'value' }
    ]);

    // Check if code already exists
    const normalizedCode = normalizeString(code).toUpperCase();
    const existingCode = discountCodes.find(dc => dc.code.toUpperCase() === normalizedCode);
    if (existingCode) {
      throw createHttpError(400, 'Discount code already exists');
    }

    // Generate new ID
    const newId = Math.max(...discountCodes.map(dc => dc.id), 0) + 1;

    const newDiscountCode = {
      id: newId,
      code: normalizedCode,
      type,
      value: parseNumberField(value, 'Value', { min: 0.01 }),
      minOrderAmount: hasValue(minOrderAmount) ? parseNumberField(minOrderAmount, 'Minimum order amount', { min: 0 }) : 0,
      maxDiscount: hasValue(maxDiscount)
        ? parseNumberField(maxDiscount, 'Maximum discount', { min: 0 })
        : parseNumberField(value, 'Value', { min: 0.01 }),
      usageLimit: hasValue(usageLimit)
        ? parseNumberField(usageLimit, 'Usage limit', { integer: true, min: 1 })
        : null,
      usedCount: 0,
      isActive: true,
      validFrom: validFrom || new Date().toISOString(),
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    discountCodes.push(newDiscountCode);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'discount.create',
      targetType: 'discountCode',
      targetId: newDiscountCode.id,
      summary: `Created discount code "${newDiscountCode.code}"`,
      changes: {
        code: newDiscountCode.code,
        type: newDiscountCode.type,
        value: newDiscountCode.value,
        isActive: newDiscountCode.isActive
      }
    });

    res.status(201).json({
      success: true,
      data: newDiscountCode,
      message: 'Discount code created successfully'
    });

  } catch (error) {
    console.error('Create discount code error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to create discount code' : error.message,
      message: error.message
    });
  }
};

// Update discount code
export const updateDiscountCode = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const discountCodeIndex = discountCodes.findIndex(dc => dc.id === parseInt(id));

    if (discountCodeIndex === -1) {
      return res.status(404).json({
        error: 'Discount code not found'
      });
    }

    // Check if code already exists (if updating code)
    if (updateData.code) {
      const existingCode = discountCodes.find(dc => 
        dc.code.toUpperCase() === updateData.code.toUpperCase() && dc.id !== parseInt(id)
      );
      if (existingCode) {
        throw createHttpError(400, 'Discount code already exists');
      }
    }

    // Update discount code
    const previousDiscountCode = {
      code: discountCodes[discountCodeIndex].code,
      value: discountCodes[discountCodeIndex].value,
      isActive: discountCodes[discountCodeIndex].isActive
    };
    const updatedDiscountCode = {
      ...discountCodes[discountCodeIndex],
      ...updateData,
      id: parseInt(id), // Ensure ID doesn't change
      code: updateData.code ? normalizeString(updateData.code).toUpperCase() : discountCodes[discountCodeIndex].code,
      updatedAt: new Date().toISOString()
    };

    // Handle numeric fields
    if (hasValue(updateData.value)) {
      updatedDiscountCode.value = parseNumberField(updateData.value, 'Value', { min: 0.01 });
    }
    if (hasValue(updateData.minOrderAmount)) {
      updatedDiscountCode.minOrderAmount = parseNumberField(updateData.minOrderAmount, 'Minimum order amount', { min: 0 });
    }
    if (hasValue(updateData.maxDiscount)) {
      updatedDiscountCode.maxDiscount = parseNumberField(updateData.maxDiscount, 'Maximum discount', { min: 0 });
    }
    if (hasValue(updateData.usageLimit)) {
      updatedDiscountCode.usageLimit = parseNumberField(updateData.usageLimit, 'Usage limit', { integer: true, min: 1 });
    }

    discountCodes[discountCodeIndex] = updatedDiscountCode;
    savePersistentState();
    recordAdminAudit(req, {
      action: 'discount.update',
      targetType: 'discountCode',
      targetId: updatedDiscountCode.id,
      summary: `Updated discount code "${updatedDiscountCode.code}"`,
      changes: {
        before: {
          code: previousDiscountCode.code,
          value: previousDiscountCode.value,
          isActive: previousDiscountCode.isActive
        },
        after: {
          code: updatedDiscountCode.code,
          value: updatedDiscountCode.value,
          isActive: updatedDiscountCode.isActive
        }
      }
    });

    res.json({
      success: true,
      data: updatedDiscountCode,
      message: 'Discount code updated successfully'
    });

  } catch (error) {
    console.error('Update discount code error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Failed to update discount code' : error.message,
      message: error.message
    });
  }
};

// Delete discount code
export const deleteDiscountCode = async (req, res) => {
  try {
    const { id } = req.params;
    const discountCodeIndex = discountCodes.findIndex(dc => dc.id === parseInt(id));

    if (discountCodeIndex === -1) {
      return res.status(404).json({
        error: 'Discount code not found'
      });
    }

    const deletedDiscountCode = discountCodes[discountCodeIndex];
    discountCodes.splice(discountCodeIndex, 1);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'discount.delete',
      targetType: 'discountCode',
      targetId: deletedDiscountCode.id,
      summary: `Deleted discount code "${deletedDiscountCode.code}"`,
      metadata: {
        code: deletedDiscountCode.code,
        type: deletedDiscountCode.type
      }
    });

    res.json({
      success: true,
      data: deletedDiscountCode,
      message: 'Discount code deleted successfully'
    });

  } catch (error) {
    console.error('Delete discount code error:', error);
    res.status(500).json({
      error: 'Failed to delete discount code',
      message: error.message
    });
  }
};

// Validate discount code (public endpoint)
export const validateDiscountCode = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        error: 'Missing required fields: code, orderAmount'
      });
    }

    const discountData = calculateDiscountAmountForOrder(code, orderAmount);

    res.json({
      success: true,
      valid: true,
      data: discountData
    });

  } catch (error) {
    console.error('Validate discount code error:', error);
    const statusCode = error.message === 'Invalid discount code' ? 404 : 400;
    res.status(statusCode).json({
      error: error.message || 'Failed to validate discount code',
      valid: false
    });
  }
};

// Apply discount code (increment usage count)
export const applyDiscountCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Discount code is required'
      });
    }

    const updatedDiscountCode = incrementDiscountUsage(code);

    if (!updatedDiscountCode) {
      return res.status(404).json({
        error: 'Invalid discount code'
      });
    }

    res.json({
      success: true,
      message: 'Discount code applied successfully'
    });

  } catch (error) {
    console.error('Apply discount code error:', error);
    res.status(500).json({
      error: 'Failed to apply discount code',
      message: error.message
    });
  }
};

// Get discount code statistics
export const getDiscountCodeStats = async (req, res) => {
  try {
    const stats = {
      total: discountCodes.length,
      active: discountCodes.filter(dc => dc.isActive).length,
      inactive: discountCodes.filter(dc => !dc.isActive).length,
      totalUsage: discountCodes.reduce((sum, dc) => sum + dc.usedCount, 0),
      percentageCodes: discountCodes.filter(dc => dc.type === 'percentage').length,
      fixedCodes: discountCodes.filter(dc => dc.type === 'fixed').length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get discount code stats error:', error);
    res.status(500).json({
      error: 'Failed to get discount code statistics',
      message: error.message
    });
  }
};
