const { HTTP_STATUS } = require('../config/constants');

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode: err.statusCode
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const errorResponse = {
    error: err.message || 'Internal server error'
  };

  if (err.errors && Array.isArray(err.errors)) {
    errorResponse.details = err.errors;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to catch async errors
 * Wraps async functions to catch errors and pass them to errorHandler
 * @param {Function} fn - Async controller function
 * @returns {Function} Middleware that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};
