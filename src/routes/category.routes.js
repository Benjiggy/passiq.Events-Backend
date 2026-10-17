const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/category.controller");
const {
  authenticateToken,
  optionalAuth,
  requireAdmin,
} = require("../middlewares/auth.middleware");

// Public Category Routes
router.get("/", optionalAuth, CategoryController.getCategories);
// router.get("/:id", CategoryController.getCategory);

// Admin Management Routes
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  CategoryController.createCategory,
);

module.exports = router;
