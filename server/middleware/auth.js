const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

/**
 * Verifies the Bearer JWT on the request, loads the user, and attaches
 * it to req.user. Every downstream route that reads/writes user data
 * relies on req.user.id — never trust a userId passed in the body.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized('No authentication token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired session, please log in again');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }

  req.user = user;
  next();
});

module.exports = { protect };
