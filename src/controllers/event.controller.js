const dataStore = require("../models/dataStore");
const ApiResponse = require("../utils/apiResponse");
const { DEFAULT_CATEGORIES } = require("../config/constants");
const { toKobo } = require("../utils/formatters");

class EventController {
  /**
   * List Public Events
   * GET /api/events
   */
  static async listEvents(req, res, next) {
    try {
      const { category, search, city, featured, status } = req.query;

      const events = await dataStore.listEvents({
        status: status || "published",
        category,
        search,
        featured: featured ? featured === "true" : undefined,
      });

      return res.status(200).json({
        success: true,
        status: "success",
        events,
        data: events,
        total: events.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Event By ID or Slug
   * GET /api/events/:idOrSlug
   */
  static async getEvent(req, res, next) {
    try {
      const { idOrSlug } = req.params;
      const event = await dataStore.getEventByIdOrSlug(idOrSlug);

      if (!event) {
        return ApiResponse.error(res, "Event not found", 404);
      }

      return res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create New Event (Host Only)
   * POST /api/events
   */
  static async createEvent(req, res, next) {
    try {
      const {
        title,
        category = "Music & Concerts",
        date,
        time = "18:00",
        location,
        city = "Lagos",
        country = "Nigeria",
        price = 0,
        capacity = 100,
        status = "published",
        description = "",
        subtitle = "",
        image = "",
        poster = "",
        ticketTiers,
      } = req.body;

      if (!title || !date || !location) {
        return ApiResponse.error(
          res,
          "Title, date, and venue location are required.",
          400,
        );
      }

      if (!image) {
        return ApiResponse.error(res, "Event image is required.", 400);
      }

      // const slug = `${title
      //   .toLowerCase()
      //   .replace(/[^a-z0-9]+/g, "-")
      //   .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      const numericPrice = Number(price) || 0;
      const numericCapacity = Number(capacity) || 100;

      // Setup default ticket tier if not explicitly provided
      const defaultTiers =
        Array.isArray(ticketTiers) && ticketTiers.length > 0
          ? ticketTiers.map((t, idx) => ({
              name: t.name || "General Admission",
              price: Number(t.price) || 0,
              unitAmountKobo: toKobo(t.price || 0),
              capacity: Number(t.capacity) || numericCapacity,
              sold: 0,
              description: t.description || "Standard access ticket pass.",
            }))
          : [
              {
                name: "General Admission",
                price: numericPrice,
                unitAmountKobo: toKobo(numericPrice),
                capacity: numericCapacity,
                sold: 0,
                description: "Standard access ticket pass.",
              },
            ];

      const newEvent = await dataStore.createEvent({
        title: title.trim(),
        slug: title.trim(),
        subtitle,
        description,
        category,
        date,
        time,
        location: location.trim(),
        address: location.trim(),
        city,
        country,
        currency: "NGN",
        price: numericPrice,
        minPrice: numericPrice,
        maxPrice: numericPrice,
        capacity: numericCapacity,
        soldCount: 0,
        image:
          image ||
          "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
        poster: poster || image || "",
        status: status || "published",
        completionStatus: "upcoming",
        ownerId: req.user.id,
        organizer: {
          name: req.user.name || "Passiq Organizer",
          email: req.user.email,
          phone: req.user.phone || "",
          verified: true,
        },
        directions: {
          venueName: location.trim(),
          shortCode: "GATE-A",
          address: location.trim(),
          rating: 4.8,
          reviewCount: 0,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`,
        },
        ticketTiers: defaultTiers,
      });

      return ApiResponse.success(
        res,
        "Event created successfully",
        newEvent,
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * List Own Hosted Events
   * GET /api/events/user/my-events
   */
  static async listOwnEvents(req, res, next) {
    try {
      const events = await dataStore.listEvents({ ownerId: req.user.id });
      return ApiResponse.success(res, "Your hosted events", events);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Event
   * PUT /api/events/:id
   */
  static async updateEvent(req, res, next) {
    try {
      const { id } = req.params;
      const event = await dataStore.getEventByIdOrSlug(id);

      if (!event) return ApiResponse.error(res, "Event not found", 404);

      if (
        (event.ownerId?.id || event.ownerId)?.toString() !==
          req.user.id.toString() &&
        req.user.role !== "admin"
      ) {
        return ApiResponse.error(
          res,
          "You do not have permission to edit this event.",
          403,
        );
      }

      const updated = await dataStore.updateEvent(
        event.id || event._id,
        req.body,
      );
      return ApiResponse.success(res, "Event updated successfully", updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Event Status (Draft / Published / Completed)
   * PATCH /api/events/:id/status
   */
  static async setStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const event = await dataStore.getEventByIdOrSlug(id);
      if (!event) return ApiResponse.error(res, "Event not found", 404);

      if (
        (event.ownerId?.id || event.ownerId)?.toString() !==
          req.user.id.toString() &&
        req.user.role !== "admin"
      ) {
        return ApiResponse.error(res, "Access denied.", 403);
      }

      const updated = await dataStore.updateEvent(event.id || event._id, {
        status,
        ...(status === "completed" ? { completionStatus: "completed" } : {}),
      });

      return ApiResponse.success(res, `Event status set to ${status}`, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Event
   * DELETE /api/events/:id
   */
  static async deleteEvent(req, res, next) {
    try {
      const { id } = req.params;
      const event = await dataStore.getEventByIdOrSlug(id);
      if (!event) return ApiResponse.error(res, "Event not found", 404);

      if (
        (event.ownerId?.id || event.ownerId)?.toString() !==
          req.user.id.toString() &&
        req.user.role !== "admin"
      ) {
        return ApiResponse.error(res, "Access denied.", 403);
      }

      await dataStore.deleteEvent(event.id || event._id);
      return ApiResponse.success(res, "Event deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EventController;
