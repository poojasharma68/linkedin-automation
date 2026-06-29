import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.warn('Operational error', {
      statusCode,
      message: err.message,
      details: err.details,
    });
  }

  const response = {
    success: false,
    message: isOperational ? err.message : 'Internal server error',
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV === 'development' && !isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default { notFoundHandler, errorHandler };
