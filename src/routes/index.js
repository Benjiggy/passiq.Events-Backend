const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const eventRoutes = require("./event.routes");
const ticketRoutes = require("./ticket.routes");
const paymentRoutes = require("./payment.routes");
const financeRoutes = require("./finance.routes");
const withdrawalRoutes = require("./withdrawal.routes");
const boxOfficeRoutes = require("./boxOffice.routes");
const discountRoutes = require("./discount.routes");
const blogRoutes = require("./blog.routes");
const memoryRoutes = require("./memory.routes");
const newsletterRoutes = require("./newsletter.routes");
const adminRoutes = require("./admin.routes");
const categoryRoutes = require("./category.routes");

// Health Check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Passiq Events API Backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
router.use("/auth", authRoutes);
router.use("/events", eventRoutes);
router.use("/tickets", ticketRoutes);
router.use("/payments", paymentRoutes);
router.use("/paystack", paymentRoutes); // Direct alias for frontend /api/paystack/...
router.use("/finance", financeRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/box-office", boxOfficeRoutes);
router.use("/discounts", discountRoutes);
router.use("/blogs", blogRoutes);
router.use("/memories", memoryRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);

module.exports = router;
