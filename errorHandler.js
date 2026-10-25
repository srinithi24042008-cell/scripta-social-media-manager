const { logger } = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Translate known Mongoose, MongoDB, and JWT errors into operational AppErrors
 * so the global handler can return friendly responses without leaking stack traces.
 */
function normalizeError(err) {
  // Mongoose CastError — invalid ObjectId / field type (e.g. GET /posts/not-a-valid-id)
  if (err.name === 'CastError') {
    return new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400);
  }

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
    return new AppError(`Duplicate value: a record with this ${field} already exists.`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join('; ');
    return new AppError(`Validation failed: ${messages}`, 400);
  }

  // JWT errors — treat as operational (401) so stack trace is not logged
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Authentication token has expired', 401);
  }

  // CORS errors from our custom CORS handler
  if (err.message && err.message.startsWith('CORS:')) {
    return new AppError(err.message, 403);
  }

  return err; // Return as-is — will be handled as unknown error below
}

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  const normalized = normalizeError(err);

  normalized.statusCode = normalized.statusCode || 500;
  normalized.status = normalized.status || 'error';

  // Log error at appropriate severity
  if (normalized.isOperational) {
    logger.warn(`[${normalized.statusCode}] ${normalized.message}`, {
      path: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.error('Unhandled Error', {
      error: normalized.message,
      path: req.originalUrl,
      method: req.method,
      stack: normalized.stack,
    });
  }

  // Never leak stack traces to the client in production
  res.status(normalized.statusCode).json({
    success: false,
    message: normalized.isOperational ? normalized.message : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: normalized.stack }),
  });
}

/**
 * Catch async errors and forward them to the error handler
 */
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = { AppError, errorHandler, catchAsync };
