const crypto = require("crypto");
const dataStore = require("../models/dataStore");
const QrService = require("./qr.service");
const EmailService = require("./email.service");
const { generateTicketCode } = require("../utils/formatters");
const logger = require("../utils/logger");

class TicketService {
  /**
   * Issue Tickets for a verified Order
   */
  static async issueTicketsForOrder(order) {
    const event = await dataStore.getEventByIdOrSlug(order.eventId);
    if (!event) throw new Error("Associated event not found");

    const tier = (event.ticketTiers || []).find(
      (t) => (t.id || t._id)?.toString() === order.tierId?.toString(),
    );
    const tierName = tier ? tier.name : "Regular";

    const issuedTickets = [];

    for (let i = 0; i < order.quantity; i++) {
      const ticketCode = generateTicketCode(event.slug || event.id, i + 1);
      // Generate a cryptographically random token for every ticket QR code
      const randomNonce = crypto.randomBytes(6).toString("hex").toUpperCase();
      const qrToken = `PASSIQ-LIVE:${ticketCode}:${order.reference}:${randomNonce}`;
      const qrDataUrl = await QrService.generateQrCodeDataUrl(qrToken);

      const ticket = await dataStore.createTicket({
        ticketCode,
        reference: order.reference,
        paymentReference: order.reference,
        qrToken,
        qrDataUrl,
        buyerId: order.buyerId || null,
        eventId: event.id || event._id,
        tierId: order.tierId,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time || "18:00",
        eventLocation: event.location,
        eventImage: event.image || event.poster || "",
        tierName,
        userName: order.attendeeName,
        userEmail: order.email,
        userPhone: order.phone || "",
        unitPrice: order.unitAmountKobo
          ? order.unitAmountKobo / 100
          : (order.amount || 0) / order.quantity,
        totalAmount: order.unitAmountKobo
          ? order.unitAmountKobo / 100
          : (order.amount || 0) / order.quantity,
        currency: order.currency || "NGN",
        status: "valid",
        isDemo: false,
        issuedAt: new Date(),
      });

      issuedTickets.push(ticket);
    }

    // Update tier sold count and event capacity count
    if (tier) {
      tier.sold = (tier.sold || 0) + order.quantity;
      event.soldCount = (event.soldCount || 0) + order.quantity;
      await dataStore.updateEvent(event.id || event._id, {
        ticketTiers: event.ticketTiers,
        soldCount: event.soldCount,
      });
    }

    // Dispatch email notification with tickets, random QR codes, numbers and amount
    try {
      await EmailService.sendTicketPurchaseConfirmation({
        order,
        event,
        tier,
        tickets: issuedTickets,
      });
      logger.info(
        `[TicketService] Confirmation email with ${issuedTickets.length} ticket(s) dispatched to ${order.email}`,
      );
    } catch (emailErr) {
      logger.error(
        `[TicketService] Error dispatching confirmation email to ${order.email}:`,
        emailErr,
      );
    }

    return issuedTickets;
  }

  /**
   * Get User Tickets
   */
  static async getUserTickets(userId, email) {
    return await dataStore.listTicketsByUser(userId, email);
  }

  /**
   * Get Ticket Details
   */
  static async getTicketDetails(idOrCode) {
    return await dataStore.getTicketByCodeOrId(idOrCode);
  }

  /**
   * Gate Scanner Check-in Verification
   */
  static async checkInTicket(ticketCodeOrQrToken, scannerStaff = "Gate Staff") {
    let cleanCode = ticketCodeOrQrToken.trim();
    if (
      cleanCode.startsWith("PASSIQ-LIVE:") ||
      cleanCode.startsWith("PASSIQ-DEMO:")
    ) {
      const parts = cleanCode.split(":");
      cleanCode = parts[1] || parts[0];
    }

    const ticket = await dataStore.getTicketByCodeOrId(cleanCode);
    if (!ticket) {
      return {
        success: false,
        status: "invalid",
        message: "Invalid ticket pass. No matching ticket found.",
      };
    }

    if (ticket.status === "used") {
      return {
        success: false,
        status: "already_used",
        message: `Ticket already checked in at ${new Date(ticket.checkedInAt).toLocaleTimeString()}.`,
        ticket,
      };
    }

    if (ticket.status === "revoked") {
      return {
        success: false,
        status: "revoked",
        message: "This ticket pass has been revoked or refunded.",
        ticket,
      };
    }

    // Mark as checked in
    const updated = await dataStore.updateTicket(ticket.id || ticket._id, {
      status: "used",
      checkedInAt: new Date(),
      checkedInBy: scannerStaff,
    });

    return {
      success: true,
      status: "checked_in",
      message: `Welcome, ${ticket.userName}! Ticket successfully validated.`,
      ticket: updated || ticket,
    };
  }
}

module.exports = TicketService;
