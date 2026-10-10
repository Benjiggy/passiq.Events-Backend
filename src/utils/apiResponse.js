/**
 * Standard API Response Formatter
 */
class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      status: 'success',
      message,
      ...(data !== null ? (typeof data === 'object' && !Array.isArray(data) && data.data ? data : { data }) : {}),
      ...(Array.isArray(data) ? { data, count: data.length } : {})
    });
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      status: 'error',
      message,
      ...(errors ? { errors } : {})
    });
  }

  static paginated(res, message = 'Success', items = [], total = 0, page = 1, limit = 20) {
    const totalPages = Math.ceil(total / limit) || 1;
    return res.status(200).json({
      success: true,
      status: 'success',
      message,
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  }
}

module.exports = ApiResponse;
