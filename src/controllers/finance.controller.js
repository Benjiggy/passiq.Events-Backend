const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const FinanceService = require('../services/finance.service');

class FinanceController {
  /**
   * Get Host Balance & Earnings Overview
   * GET /api/finance/balance
   */
  static async getBalance(req, res, next) {
    try {
      const financialData = await FinanceService.calculateHostBalance(req.user.id);
      const user = await dataStore.findUserById(req.user.id);

      return res.status(200).json({
        status: 'success',
        success: true,
        data: {
          ...financialData,
          payoutAccount: user?.payoutAccount || null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save Host Payout Bank Details
   * POST /api/finance/payout-account
   */
  static async savePayoutAccount(req, res, next) {
    try {
      const { bankName, accountNumber, accountName } = req.body;

      if (!bankName || !accountNumber || !accountName) {
        return ApiResponse.error(res, 'Bank name, account number, and account holder name are required.', 400);
      }

      if (!/^\d{10}$/.test(accountNumber.trim())) {
        return ApiResponse.error(res, 'Account number must be exactly 10 digits.', 400);
      }

      const payoutAccount = {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        isVerified: true,
        updatedAt: new Date().toISOString()
      };

      await dataStore.updateUser(req.user.id, { payoutAccount });

      return ApiResponse.success(res, 'Payout bank account saved successfully', payoutAccount);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FinanceController;
