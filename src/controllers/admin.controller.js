const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const FinanceService = require('../services/finance.service');

class AdminController {
  /**
   * Platform Overview Summary
   * GET /api/admin/platform/summary
   */
  static async getPlatformSummary(req, res, next) {
    try {
      const summary = await FinanceService.getPlatformSummary();
      return ApiResponse.success(res, 'Platform metrics retrieved', summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Platform Hosts
   * GET /api/admin/hosts
   */
  static async listHosts(req, res, next) {
    try {
      const users = await dataStore.listUsers();
      const events = await dataStore.listEvents();

      const hosts = [];

      for (const user of users) {
        const uId = (user.id || user._id)?.toString();
        const userEvents = events.filter(e => (e.ownerId?.id || e.ownerId)?.toString() === uId);

        // Include users that are hosts/admins or have created events
        if (user.role === 'host' || user.role === 'admin' || userEvents.length > 0) {
          const finance = await FinanceService.calculateHostBalance(uId);

          hosts.push({
            id: uId,
            name: user.name,
            email: user.email,
            role: user.role,
            accountType: user.accountType || user.role,
            eventCount: userEvents.length,
            ticketsSold: finance.balance.ticketsSold,
            earnedKobo: finance.balance.earnedKobo,
            lockedKobo: finance.balance.lockedKobo
          });
        }
      }

      return ApiResponse.success(res, 'Event hosts retrieved', { hosts });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
