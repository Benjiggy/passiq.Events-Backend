const express = require("express");
const router = express.Router();
const EventController = require("../controllers/event.controller");
const {
  authenticateToken,
  requireHostOrAdmin,
  optionalAuth,
} = require("../middlewares/auth.middleware");

// Public Event Routes
router.get("/", optionalAuth, EventController.listEvents);
router.get(
  "/user/my-events",
  authenticateToken,
  requireHostOrAdmin,
  EventController.listOwnEvents,
);
router.get("/:idOrSlug", EventController.getEvent);

// Host & Admin Management Routes
router.post(
  "/",
  authenticateToken,
  requireHostOrAdmin,
  EventController.createEvent,
);
router.put(
  "/:id",
  authenticateToken,
  requireHostOrAdmin,
  EventController.updateEvent,
);
router.patch(
  "/:id/status",
  authenticateToken,
  requireHostOrAdmin,
  EventController.setStatus,
);
router.delete(
  "/:id",
  authenticateToken,
  requireHostOrAdmin,
  EventController.deleteEvent,
);

module.exports = router;
