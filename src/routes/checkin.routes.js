const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const CheckinController = require('../controllers/checkin.controller');
const { authenticateToken, requireStaffOrAdmin } = require('../middlewares/auth.middleware');

// Rate limiter for barcode scanner endpoint (allows up to 120 scans per minute per device)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    result: 'rate_limited',
    message: 'Scanner rate limit exceeded. Please slow down.'
  }
});

// Protect checkin routes: require staff, scanner, host, or admin role
router.use(authenticateToken);
router.use(requireStaffOrAdmin);

// POST /api/checkin/scan
router.post('/scan', scanLimiter, CheckinController.scanTicket);

// GET /api/checkin/recent?eventId=
router.get('/recent', CheckinController.getRecentScans);

// GET /api/checkin/stats?eventId=
router.get('/stats', CheckinController.getStats);

module.exports = router;
