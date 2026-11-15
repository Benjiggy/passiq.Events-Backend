const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const WithdrawalController = require("../controllers/withdrawal.controller");
const AuthController = require("../controllers/auth.controller");
const PublicStatsController = require("../controllers/publicStats.controller");
const CheckinController = require("../controllers/checkin.controller");
const {
  authenticateToken,
  requireAdmin,
} = require("../middlewares/auth.middleware");
const FinanceService = require("../services/finance.service");

router.post("/register", AuthController.register);
router.get(
  "/platform/summary",
  authenticateToken,
  requireAdmin,
  AdminController.getPlatformSummary,
);
router.get(
  "/hosts",
  authenticateToken,
  requireAdmin,
  AdminController.listHosts,
);
router.get(
  "/withdrawals",
  authenticateToken,
  requireAdmin,
  WithdrawalController.listAdminWithdrawals,
);
router.post(
  "/withdrawals/:id/transition",
  authenticateToken,
  requireAdmin,
  WithdrawalController.transitionWithdrawal,
);
router.post(
  "/events/:eventId/regenerate-stats-token",
  authenticateToken,
  requireAdmin,
  PublicStatsController.regenerateStatsToken,
);

// Admin Check-in logs, export, and status management
router.get(
  "/checkins",
  authenticateToken,
  requireAdmin,
  CheckinController.listAdminScans,
);
router.get(
  "/checkins/export",
  authenticateToken,
  requireAdmin,
  CheckinController.exportScansCsv,
);
router.post(
  "/checkins/ticket-status",
  authenticateToken,
  requireAdmin,
  CheckinController.updateTicketStatus,
);

// GET /api/debug/ticket-reconciliation
// GET /api/debug/ticket-reconciliation?eventId=<id>
router.get("/ticket-reconciliation", async (req, res) => {
  try {
    const data = await FinanceService.getTicketReconciliation({
      eventId: req.query.eventId,
    });
    res.json({ success: true, data });
  } catch (err) {
    const status = /Invalid eventId/.test(err.message) ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

module.exports = router;
