const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const PublicStatsController = require("../controllers/publicStats.controller");

// Dedicated rate limiter: 30 requests per minute per client IP
const publicStatsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    message: "Too many requests. Please try again in a minute.",
  },
});

// GET /api/public/events/:eventId/stats?token=<statsToken>
router.get(
  "/events/:eventId/stats",
  publicStatsLimiter,
  PublicStatsController.getEventStats,
);

module.exports = router;
