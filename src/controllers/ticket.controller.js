const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const TicketService = require('../services/ticket.service');

class TicketController {
  /**
   * Get User Tickets
   * GET /api/tickets/my-tickets
   */
  static async getMyTickets(req, res, next) {
    try {
      const tickets = await TicketService.getUserTickets(req.user?.id, req.user?.email);
      return res.status(200).json({
        status: 'success',
        success: true,
        tickets,
        data: tickets,
        count: tickets.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Ticket Details by Code or ID
   * GET /api/tickets/:idOrCode
   */
  static async getTicketDetails(req, res, next) {
    try {
      const { idOrCode } = req.params;
      const ticket = await TicketService.getTicketDetails(idOrCode);

      if (!ticket) {
        return ApiResponse.error(res, 'Ticket not found.', 404);
      }

      return res.status(200).json(ticket);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate / Scan Ticket at Gate
   * POST /api/tickets/scan
   */
  static async scanTicket(req, res, next) {
    try {
      const { codeOrToken, scannerStaff } = req.body;
      if (!codeOrToken) {
        return ApiResponse.error(res, 'Ticket code or QR token is required for scanning.', 400);
      }

      const result = await TicketService.checkInTicket(codeOrToken, scannerStaff || req.user?.name || 'Gate Scanner');
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TicketController;
