const crypto = require("crypto");
const mongoose = require("mongoose");
const dataStore = require("../models/dataStore");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { isDbConnected } = require("../config/db");
const logger = require("../utils/logger");

// Ticket statuses that count as a real, sold ticket
const SOLD_STATUSES = ["valid", "used"];
const RECENT_LIMIT = 6;
const NOT_FOUND = {
  success: false,
  message: "Event not found or invalid link.",
};

const toStr = (v) => (v ? String(v._id || v.id || v) : "");

// Compare tokens in constant time. Hashing first gives both sides equal length,
// so the length of the real token is never leaked either.
const tokensMatch = (provided, actual) => {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(actual).digest();
  return crypto.timingSafeEqual(a, b);
};

// Short, non-reversible id so payment references are never exposed
const publicId = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);

/**
 * Reads sales for one event from the Ticket collection only.
 * Returns:
 *   tierCounts: [{ tierId, tierName, sold }]
 *   recent:     [{ id, tierId, tierName, quantity, createdAt }]
 */
async function loadTicketStats(eventId) {
  // Database
  if (isDbConnected()) {
    const match = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: { $in: SOLD_STATUSES },
      isDemo: { $ne: true },
    };

    const [tierRows, recentRows] = await Promise.all([
      Ticket.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$tierId",
            tierName: { $first: { $ifNull: ["$tierName", "$ticketType"] } },
            sold: { $sum: 1 },
          },
        },
      ]),
      // One row per purchase (grouped by payment reference), newest first
      Ticket.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$reference",
            tierId: { $first: "$tierId" },
            tierName: { $first: { $ifNull: ["$tierName", "$ticketType"] } },
            quantity: { $sum: 1 },
            createdAt: { $max: "$createdAt" },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: RECENT_LIMIT },
      ]),
    ]);

    return {
      tierCounts: tierRows.map((r) => ({
        tierId: toStr(r._id),
        tierName: r.tierName || "",
        sold: r.sold,
      })),
      recent: recentRows.map((r) => ({
        id: publicId(r._id),
        tierId: toStr(r.tierId),
        tierName: r.tierName || "",
        quantity: r.quantity,
        createdAt: r.createdAt,
      })),
    };
  }

  // In-memory store (no database connection)
  const tickets = (dataStore.memory?.tickets || []).filter(
    (t) =>
      toStr(t.eventId) === eventId &&
      SOLD_STATUSES.includes(t.status) &&
      !t.isDemo,
  );

  const byTier = new Map();
  const byRef = new Map();
  for (const t of tickets) {
    const tierId = toStr(t.tierId);
    const tierName = t.tierName || t.ticketType || "";
    const tier = byTier.get(tierId) || { tierId, tierName, sold: 0 };
    tier.sold += 1;
    byTier.set(tierId, tier);

    const ref = t.reference || t.id || t._id;
    const purchase = byRef.get(ref) || {
      id: publicId(ref),
      tierId,
      tierName,
      quantity: 0,
      createdAt: t.createdAt,
    };
    purchase.quantity += 1;
    if (new Date(t.createdAt) > new Date(purchase.createdAt)) {
      purchase.createdAt = t.createdAt;
    }
    byRef.set(ref, purchase);
  }

  return {
    tierCounts: [...byTier.values()],
    recent: [...byRef.values()]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_LIMIT),
  };
}

class PublicStatsController {
  /**
   * Public, read-only endpoint:
   * GET /api/public/events/:eventId/stats?token=<statsToken>
   *
   * - Returns 404 if the event doesn't exist OR the token is missing/wrong
   * - Sales numbers come ONLY from the Ticket collection (valid/used, non-demo)
   * - The event document is used just for the name and each tier's name/capacity
   * - Never returns attendee names, emails, phone numbers, references, or revenue
   */
  static async getEventStats(req, res) {
    try {
      const { eventId } = req.params;
      const providedToken = String(req.query.token || "").trim();

      // 1. Validate link: every failure looks the same from outside
      if (!providedToken) return res.status(404).json(NOT_FOUND);

      const event = await dataStore.getEventByIdOrSlug(eventId);
      const actualToken = String(event?.statsToken || "").trim();
      if (!event || !actualToken || !tokensMatch(providedToken, actualToken)) {
        return res.status(404).json(NOT_FOUND);
      }

      const eId = toStr(event._id || event.id);

      // 2. Sales from tickets
      let ticketStats;
      try {
        if (isDbConnected() && !mongoose.Types.ObjectId.isValid(eId)) {
          return res.status(404).json(NOT_FOUND);
        }
        ticketStats = await loadTicketStats(eId);
      } catch (dbErr) {
        // A temporary failure must not look like an invalid link
        logger.error("Public stats ticket lookup failed:", dbErr);
        return res.status(503).json({
          success: false,
          message: "Stats are temporarily unavailable. Please try again.",
        });
      }

      // 3. Build the tier list: event tiers give name + capacity, tickets give sold
      const soldByTierId = new Map();
      const soldByTierName = new Map();
      for (const row of ticketStats.tierCounts) {
        if (row.tierId) soldByTierId.set(row.tierId, row);
        if (row.tierName) {
          const key = row.tierName.toLowerCase();
          soldByTierName.set(key, (soldByTierName.get(key) || 0) + row.sold);
        }
      }

      const claimed = new Set(); // ticket tier ids already attached to an event tier
      const tierBreakdown = (event.ticketTiers || []).map((t) => {
        const id = toStr(t._id || t.id);
        const name = t.name || "General Admission";
        const capacity = Number(t.capacity) || 0;

        let sold = 0;
        if (soldByTierId.has(id)) {
          sold = soldByTierId.get(id).sold;
          claimed.add(id);
        } else if (soldByTierName.has(name.toLowerCase())) {
          // Older tickets that carry a tier name but no matching id
          sold = soldByTierName.get(name.toLowerCase());
          for (const row of ticketStats.tierCounts) {
            if ((row.tierName || "").toLowerCase() === name.toLowerCase()) {
              claimed.add(row.tierId);
            }
          }
        }

        return {
          name,
          sold,
          capacity,
          isSoldOut: Boolean(t.isSoldOut) || (capacity > 0 && sold >= capacity),
        };
      });

      // Tickets whose tier is no longer on the event are still counted
      for (const row of ticketStats.tierCounts) {
        if (claimed.has(row.tierId)) continue;
        tierBreakdown.push({
          name: row.tierName || "Other",
          sold: row.sold,
          capacity: 0,
          isSoldOut: false,
        });
      }

      // 4. Total = every counted ticket for this event
      const ticketsSold = ticketStats.tierCounts.reduce(
        (sum, r) => sum + r.sold,
        0,
      );

      // 5. Anonymised recent purchases
      const tierNameById = new Map(
        (event.ticketTiers || []).map((t) => [toStr(t._id || t.id), t.name]),
      );
      const recentPurchases = ticketStats.recent.map((p) => ({
        id: p.id,
        tierName: tierNameById.get(p.tierId) || p.tierName || "Ticket",
        quantity: p.quantity,
        createdAt: p.createdAt,
      }));

      // Always fresh numbers, never cached by browsers or proxies
      res.set("Cache-Control", "no-store");

      return res.status(200).json({
        success: true,
        eventName: event.title,
        ticketsSold,
        tierBreakdown,
        recentPurchases,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Public stats error:", error);
      return res.status(404).json(NOT_FOUND);
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
      const baseUrl = (
        process.env.FRONTEND_URL || "https://passiq.events"
      ).replace(/\/$/, "");

      return res.status(200).json({
        success: true,
        status: "success",
        message:
          "Stats token regenerated successfully. Previous links have been revoked.",
        data: {
          eventId: targetId,
          statsToken: newToken,
          statsUrl: `${baseUrl}/event-stats/${targetId}?token=${newToken}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PublicStatsController;
