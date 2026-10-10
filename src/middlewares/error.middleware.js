const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'An unexpected error occurred.';

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found or invalid identifier format.';
    statusCode = 404;
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Please use another value.`;
    statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    statusCode = 400;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token signature.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Authentication token expired.';
    statusCode = 401;
  }

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);

  return ApiResponse.error(res, message, statusCode, process.env.NODE_ENV === 'development' ? { stack: err.stack } : null);
};

module.exports = { notFound, errorHandler };
