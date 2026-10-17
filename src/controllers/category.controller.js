const dataStore = require("../models/dataStore");
const ApiResponse = require("../utils/apiResponse");

class CategoryController {
  /**
   * Get Categories
   * GET /api/categories
   */
  static async getCategories(req, res, next) {
    try {
      const categories = await dataStore.listCategories();

      return ApiResponse.success(res, "Categories retrieved", { categories });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req, res, next) {
    try {
      const { name, description, image } = req.body;

      const newCategory = await dataStore.createCategory({
        name: name.trim().toLowerCase(),
        description: description.trim(),
        image: image || "",
      });

      return ApiResponse.success(res, "Category created", {
        category: newCategory,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
