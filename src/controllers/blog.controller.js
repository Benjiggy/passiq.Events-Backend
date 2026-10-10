const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');

class BlogController {
  /**
   * List Blogs
   * GET /api/blogs
   */
  static async listBlogs(req, res, next) {
    try {
      const { category } = req.query;
      const blogs = await dataStore.listBlogs(category);
      return res.status(200).json({
        status: 'success',
        success: true,
        blogs,
        total: blogs.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Blog By Slug
   * GET /api/blogs/:slug
   */
  static async getBlogBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const blog = await dataStore.getBlogBySlug(slug);

      if (!blog) {
        return ApiResponse.error(res, 'Article not found', 404);
      }

      const allBlogs = await dataStore.listBlogs();
      const related = allBlogs.filter(b => b.slug !== slug).slice(0, 3);

      return res.status(200).json({
        status: 'success',
        success: true,
        blog,
        related
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BlogController;
