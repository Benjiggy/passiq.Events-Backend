const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const FinanceService = require('../services/finance.service');
const { toKobo, toNaira } = require('../utils/formatters');

class WithdrawalController {
  /**
   * Host Request Withdrawal
   * POST /api/withdrawals/request
   */
  static async requestWithdrawal(req, res, next) {
    try {
      const { amount } = req.body;
      const amountKobo = toKobo(amount);

      if (!amountKobo || amountKobo <= 0) {
        return ApiResponse.error(res, 'Please provide a valid withdrawal amount.', 400);
      }

      const host = await dataStore.findUserById(req.user.id);
      if (!host.payoutAccount || !host.payoutAccount.accountNumber) {
        return ApiResponse.error(res, 'Please configure your bank details in Account > Payouts first.', 400);
      }

      const finance = await FinanceService.calculateHostBalance(req.user.id);
      if (amountKobo > finance.balance.availableKobo) {
        return ApiResponse.error(
          res,
          `Requested amount exceeds available balance of ₦${toNaira(finance.balance.availableKobo).toLocaleString()}. Concluded event proceeds only.`,
          400
        );
      }

      const withdrawal = await dataStore.createWithdrawal({
        ownerId: req.user.id,
        hostSnapshot: {
          id: host.id || host._id,
          name: host.name,
          email: host.email,
          phone: host.phone || ''
        },
        amountKobo,
        amount: toNaira(amountKobo),
        currency: 'NGN',
        payoutSnapshot: host.payoutAccount,
        status: 'pending',
        history: [
          {
            status: 'pending',
            actorId: req.user.id,
            note: 'Withdrawal request submitted by host',
            at: new Date()
          }
        ]
      });

      return ApiResponse.success(res, 'Withdrawal request submitted successfully.', withdrawal, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Host List Own Withdrawals
   * GET /api/withdrawals/my-withdrawals
   */
  static async listMyWithdrawals(req, res, next) {
    try {
      const withdrawals = await dataStore.listWithdrawals({ ownerId: req.user.id });
      return ApiResponse.success(res, 'Your withdrawal history', withdrawals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin List All Withdrawals
   * GET /api/admin/withdrawals
   */
  static async listAdminWithdrawals(req, res, next) {
    try {
      const { status } = req.query;
      const withdrawals = await dataStore.listWithdrawals({ status });
      return ApiResponse.success(res, 'Withdrawal requests', withdrawals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin Transition Withdrawal (Reviewed, Approved, Paid, Rejected)
   * POST /api/admin/withdrawals/:id/transition
   */
  static async transitionWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const { target, note = '' } = req.body;

      const allowedTransitions = {
        pending: ['reviewed', 'rejected'],
        reviewed: ['approved', 'rejected'],
        approved: ['paid', 'simulated_paid', 'rejected']
      };

      const withdrawal = await dataStore.getWithdrawalById(id);
      if (!withdrawal) {
        return ApiResponse.error(res, 'Withdrawal request not found', 404);
      }

      if ((withdrawal.ownerId?.id || withdrawal.ownerId)?.toString() === req.user.id.toString()) {
        return ApiResponse.error(res, 'Administrators cannot self-approve their own withdrawal requests.', 400);
      }

      const validNext = allowedTransitions[withdrawal.status] || [];
      if (!validNext.includes(target) && withdrawal.status !== target) {
        return ApiResponse.error(res, `Cannot transition from ${withdrawal.status} to ${target}.`, 400);
      }

      const history = withdrawal.history || [];
      history.push({
        status: target,
        actorId: req.user.id,
        note: note.trim() || `Status updated to ${target}`,
        at: new Date()
      });

      const updated = await dataStore.updateWithdrawal(id, {
        status: target,
        history
      });

      return ApiResponse.success(res, `Withdrawal request status updated to ${target}`, updated);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WithdrawalController;
