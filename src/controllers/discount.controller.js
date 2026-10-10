const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');

class DiscountController {
  /**
   * List Organizer Discounts
   * GET /api/discounts
   */
  static async listDiscounts(req, res, next) {
    try {
      const discounts = await dataStore.listDiscounts(req.user.id);
      return ApiResponse.success(res, 'Discounts retrieved', discounts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create New Discount Code
   * POST /api/discounts
   */
  static async createDiscount(req, res, next) {
    try {
      const { code, type = 'percentage', value, maxUses = 100, eventId = null } = req.body;

      if (!code || value === undefined) {
        return ApiResponse.error(res, 'Promo code and discount value are required.', 400);
      }

      const existing = await dataStore.findDiscountByCode(code);
      if (existing) {
        return ApiResponse.error(res, 'A promo code with this name already exists.', 400);
      }

      const discount = await dataStore.createDiscount({
        code: code.trim().toUpperCase(),
        ownerId: req.user.id,
        eventId,
        type,
        value: Number(value),
        maxUses: Number(maxUses),
        usedCount: 0,
        isActive: true
      });

      return ApiResponse.success(res, 'Promo code created successfully', discount, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate Discount Code during Checkout
   * POST /api/discounts/validate
   */
  static async validateDiscount(req, res, next) {
    try {
      const { code, eventId, orderAmount } = req.body;
      if (!code) return ApiResponse.error(res, 'Promo code is required', 400);

      const discount = await dataStore.findDiscountByCode(code);
      if (!discount || !discount.isActive) {
        return ApiResponse.error(res, 'Invalid or expired promo code.', 404);
      }

      if (discount.usedCount >= discount.maxUses) {
        return ApiResponse.error(res, 'Promo code usage limit has been reached.', 400);
      }

      let discountAmount = 0;
      const base = Number(orderAmount) || 0;

      if (discount.type === 'percentage') {
        discountAmount = (base * discount.value) / 100;
      } else {
        discountAmount = Math.min(base, discount.value);
      }

      return ApiResponse.success(res, 'Promo code is valid', {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
        finalAmount: Math.max(0, base - discountAmount)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DiscountController;
