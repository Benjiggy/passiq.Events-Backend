const crypto = require("crypto");
const mongoose = require("mongoose");
const dataStore = require("../models/dataStore");
const Order = require("../models/Order");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { isDbConnected } = require("../config/db");
const logger = require("../utils/logger");

class PublicStatsController {
  /**
   * Public, read-only endpoint:
   * GET /api/public/events/:eventId/stats?token=<statsToken>
   *
   * Constraints:
   * - Returns 404 if event doesn't exist OR token is missing/wrong (never 401/403)
   * - Uses crypto.timingSafeEqual
   * - Returns ONLY { eventName, ticketsSold, lastUpdated } (plus success: true)
   * - Counts only confirmed/paid orders (status === 'success'), summing quantities
   * - Never returns attendee names, emails, phone numbers, references, or revenue
   */
  static async getEventStats(req, res, next) {
    try {
      const { eventId } = req.params;
      const providedToken = String(req.query.token || "").trim();

      // If token is missing, fail early with generic 404
      if (!providedToken) {
        return res.status(404).json({
          success: false,
          message: "Event not found or invalid link.",
        });
      }

      // Find event by ID or slug
      const event = await dataStore.getEventByIdOrSlug(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found or invalid link.",
        });
      }

      const actualToken = String(event.statsToken || "").trim();
      if (!actualToken) {
        return res.status(404).json({
          success: false,
          message: "Event not found or invalid link.",
        });
      }

      // Timing-safe token comparison
      const providedBuf = Buffer.from(providedToken, "utf8");
      const actualBuf = Buffer.from(actualToken, "utf8");

      if (
        providedBuf.length !== actualBuf.length ||
        !crypto.timingSafeEqual(providedBuf, actualBuf)
      ) {
        return res.status(404).json({
          success: false,
          message: "Event not found or invalid link.",
        });
      }

      // Count only confirmed / paid tickets (exclude pending, failed, abandoned, refunded)
      const eId = event._id || event.id;
      let ticketsSold = 0;

      if (isDbConnected() && mongoose.Types.ObjectId.isValid(eId)) {
        try {
          const matchId = new mongoose.Types.ObjectId(eId);
          const result = await Order.aggregate([
            {
              $match: {
                eventId: matchId,
                status: "success",
              },
            },
            {
              $group: {
                _id: null,
                totalSold: { $sum: "$quantity" },
              },
            },
          ]);

          ticketsSold = result[0]?.totalSold || 0;

          // If no orders matched via aggregation, check confirmed tickets
          if (ticketsSold === 0) {
            const ticketCount = await Ticket.countDocuments({
              eventId: matchId,
              status: { $in: ["valid", "used"] },
              isDemo: { $ne: true },
            });
            if (ticketCount > 0) {
              ticketsSold = ticketCount;
            }
          }
        } catch (dbErr) {
          logger.warn("Order aggregation failed, falling back to dataStore:", dbErr);
        }
      }

      // In-memory fallback if not connected or 0
      if (ticketsSold === 0) {
        const memOrders = (dataStore.memory.orders || []).filter(
          (o) =>
            (o.eventId?.id || o.eventId)?._id?.toString() === eId?.toString() ||
            (o.eventId?.id || o.eventId)?.toString() === eId?.toString(),
        );
        const paidOrders = memOrders.filter((o) => o.status === "success");
        ticketsSold = paidOrders.reduce(
          (acc, curr) => acc + (Number(curr.quantity) || 1),
          0,
        );

        if (ticketsSold === 0) {
          const memTickets = (dataStore.memory.tickets || []).filter(
            (t) =>
              ((t.eventId?.id || t.eventId)?.toString() === eId?.toString() ||
                t.eventId === eId) &&
              t.status === "valid" &&
              !t.isDemo,
          );
          if (memTickets.length > 0) {
            ticketsSold = memTickets.length;
          }
        }
      }

      // Return ONLY eventName, ticketsSold, lastUpdated (strict data hygiene)
      return res.status(200).json({
        success: true,
        eventName: event.title,
        ticketsSold: Number(ticketsSold) || 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Public stats error:", error);
      return res.status(404).json({
        success: false,
        message: "Event not found or invalid link.",
      });
    }
  }

  /**
   * Admin-only endpoint to regenerate an event's statsToken (revoking leaked links)
   * POST /api/admin/events/:eventId/regenerate-stats-token
   */
  static async regenerateStatsToken(req, res, next) {
    try {
      const { eventId } = req.params;
      const event = await dataStore.getEventByIdOrSlug(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          status: "error",
          message: "Event not found.",
        });
      }

      const newToken = crypto.randomBytes(24).toString("hex");
      const eId = event._id || event.id;

      if (isDbConnected()) {
        await Event.findByIdAndUpdate(eId, { statsToken: newToken });
      }

      event.statsToken = newToken;
      const targetId = (event.id || event._id)?.toString();

      return res.status(200).json({
        success: true,
        status: "success",
        message: "Stats token regenerated successfully. Previous links have been revoked.",
        data: {
          eventId: targetId,
          statsToken: newToken,
          statsUrl: `https://passiq.events/event-stats/${targetId}?token=${newToken}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PublicStatsController;
