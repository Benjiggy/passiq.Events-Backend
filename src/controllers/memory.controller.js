const dataStore = require('../models/dataStore');
const ApiResponse = require('../utils/apiResponse');

class MemoryController {
  static async listMemories(req, res, next) {
    try {
      const memories = await dataStore.listMemories();
      return res.status(200).json({
        status: 'success',
        success: true,
        data: memories,
        memories
      });
    } catch (error) {
      next(error);
    }
  }
}

class NewsletterController {
  static async subscribe(req, res, next) {
    try {
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return ApiResponse.error(res, 'Please provide a valid email address.', 400);
      }

      await dataStore.subscribeNewsletter(email.trim());
      return ApiResponse.success(res, 'Thank you for subscribing to Passiq Events updates!');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { MemoryController, NewsletterController };
