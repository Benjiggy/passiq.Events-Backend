const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');
const TicketService = require('../services/ticket.service');
const { generateReference, toKobo } = require('../utils/formatters');

class BoxOfficeController {
  /**
   * Walk-up Cash / POS Gate Ticket Sale
   * POST /api/box-office/walkup-sale
   */
  static async createWalkupSale(req, res, next) {
    try {
      const {
        eventId,
        tierId,
        quantity = 1,
        attendeeName = 'Walk-up Attendee',
        email,
        paymentMethod = 'cash' // cash or pos
      } = req.body;

      if (!eventId) {
        return ApiResponse.error(res, 'Event ID is required', 400);
      }

      const event = await dataStore.getEventByIdOrSlug(eventId);
      if (!event) return ApiResponse.error(res, 'Event not found', 404);

      const tiers = event.ticketTiers || [];
      const tier = tiers.find(t => (t.id || t._id)?.toString() === tierId?.toString()) || tiers[0];
      if (!tier) return ApiResponse.error(res, 'Ticket tier not found', 404);

      const numQuantity = Number(quantity) || 1;
      const totalAmount = (tier.price || 0) * numQuantity;
      const totalAmountKobo = toKobo(totalAmount);
      const reference = generateReference('BOXOFFICE');

      const order = await dataStore.createOrder({
        reference,
        buyerId: null,
        ownerId: event.ownerId?.id || event.ownerId,
        eventId: event.id || event._id,
        tierId: tier.id || tier._id,
        quantity: numQuantity,
        attendeeName: attendeeName.trim(),
        email: (email || `boxoffice_${Date.now()}@passiq.events`).toLowerCase(),
        phone: '',
        unitAmountKobo: tier.unitAmountKobo || toKobo(tier.price),
        amountKobo: totalAmountKobo,
        amount: totalAmount,
        currency: event.currency || 'NGN',
        paymentProvider: paymentMethod,
        status: 'success',
        metadata: {
          eventTitle: event.title,
          tierName: tier.name,
          posTerminal: 'Gate Box Office'
        }
      });

      const tickets = await TicketService.issueTicketsForOrder(order);

      return ApiResponse.success(res, 'Walk-up tickets issued successfully', {
        order,
        tickets
      }, 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BoxOfficeController;
