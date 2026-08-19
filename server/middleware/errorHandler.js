const ApiError = require('../utils/apiError');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message, details } = err;

  if (!statusCode) {
    // Translate common non-ApiError failures into sensible responses
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
    } else if (err.code === 11000) {
      statusCode = 409;
      message = 'A record with that value already exists';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid identifier format';
    } else {
      statusCode = 500;
      message = 'Something went wrong on our end';
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: message || 'Unexpected error',
    ...(details ? { details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
