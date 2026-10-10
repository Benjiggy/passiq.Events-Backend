const dataStore = require('../models/dataStore');
const { PLATFORM_POLICY } = require('../config/constants');
const { toKobo, toNaira } = require('../utils/formatters');

class FinanceService {
  /**
   * Calculate Host Proceeds, Deductions, and Balance
   */
  static async calculateHostBalance(hostId) {
    const events = await dataStore.listEvents({ ownerId: hostId });
    const orders = await dataStore.listOrdersByOwner(hostId);
    const withdrawals = await dataStore.listWithdrawals({ ownerId: hostId });

    // Group sales by event
    const eventSalesMap = new Map();
    for (const order of orders) {
      const eId = (order.eventId?.id || order.eventId)?.toString();
      const current = eventSalesMap.get(eId) || { grossKobo: 0, tickets: 0 };
      current.grossKobo += order.amountKobo || toKobo(order.amount);
      current.tickets += order.quantity;
      eventSalesMap.set(eId, current);
    }

    const earningsBreakdown = events.map(event => {
      const eId = (event.id || event._id)?.toString();
      const stats = eventSalesMap.get(eId) || { grossKobo: 0, tickets: 0 };
      
      const isConcluded = event.completionStatus === 'completed' || event.status === 'completed';
      const deductionKobo = isConcluded ? Math.floor((stats.grossKobo * PLATFORM_POLICY.DEDUCTION_PERCENT) / 100) : 0;
      const netKobo = stats.grossKobo - deductionKobo;

      return {
        eventId: eId,
        title: event.title,
        conclusion: isConcluded ? 'completed' : event.completionStatus || 'upcoming',
        concluded: isConcluded,
        tickets: stats.tickets,
        grossKobo: stats.grossKobo,
        deductionKobo,
        netKobo
      };
    });

    const completedGrossKobo = earningsBreakdown.filter(e => e.concluded).reduce((acc, curr) => acc + curr.grossKobo, 0);
    const feeDeductionKobo = earningsBreakdown.filter(e => e.concluded).reduce((acc, curr) => acc + curr.deductionKobo, 0);
    const lockedKobo = earningsBreakdown.filter(e => !e.concluded).reduce((acc, curr) => acc + curr.grossKobo, 0);
    const eligibleKobo = completedGrossKobo - feeDeductionKobo;

    const reservedKobo = withdrawals
      .filter(w => PLATFORM_POLICY.RESERVE_STATUSES.includes(w.status))
      .reduce((acc, curr) => acc + curr.amountKobo, 0);

    const paidKobo = withdrawals
      .filter(w => PLATFORM_POLICY.PAID_STATUSES.includes(w.status))
      .reduce((acc, curr) => acc + curr.amountKobo, 0);

    const availableKobo = Math.max(0, eligibleKobo - reservedKobo - paidKobo);
    const totalTicketsSold = orders.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      balance: {
        earnedKobo: completedGrossKobo + lockedKobo,
        completedGrossKobo,
        feeDeductionKobo,
        eligibleKobo,
        lockedKobo,
        availableKobo,
        reservedKobo,
        paidKobo,
        ticketsSold: totalTicketsSold
      },
      earnings: earningsBreakdown,
      sales: orders.map(o => ({
        id: o.id || o._id,
        reference: o.reference,
        eventTitle: o.metadata?.eventTitle || 'Event Ticket',
        quantity: o.quantity,
        amountKobo: o.amountKobo,
        createdAt: o.createdAt
      }))
    };
  }

  /**
   * Platform Overview for Admin
   */
  static async getPlatformSummary() {
    const events = await dataStore.listEvents();
    const users = await dataStore.listUsers();
    const publishedEvents = events.filter(e => e.status === 'published' || e.status === 'completed');

    let totalTicketsSold = 0;
    let totalGrossKobo = 0;

    const eventList = await Promise.all(
      publishedEvents.map(async event => {
        const eId = (event.id || event._id)?.toString();
        const orders = (await dataStore.listOrdersByOwner(event.ownerId)).filter(
          o => (o.eventId?.id || o.eventId)?.toString() === eId
        );

        const ticketsSold = orders.reduce((acc, curr) => acc + curr.quantity, 0);
        const grossKobo = orders.reduce((acc, curr) => acc + (curr.amountKobo || toKobo(curr.amount)), 0);

        totalTicketsSold += ticketsSold;
        totalGrossKobo += grossKobo;

        const owner = users.find(u => (u.id || u._id)?.toString() === (event.ownerId?.id || event.ownerId)?.toString());

        return {
          id: eId,
          title: event.title,
          ownerName: owner?.name || 'Event Host',
          date: event.date,
          status: event.status,
          ticketsSold,
          grossKobo
        };
      })
    );

    return {
      totals: {
        eventCount: publishedEvents.length,
        ticketsSold: totalTicketsSold,
        grossKobo: totalGrossKobo
      },
      events: eventList
    };
  }
}

module.exports = FinanceService;
