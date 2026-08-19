const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validators/authValidators');

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid registration details', parsed.error.flatten().fieldErrors);
  }
  const { name, email, password, companyName } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, companyName });
  const token = signToken(user._id);

  res.status(201).json({ success: true, token, user: user.toSafeObject() });
});

const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid login details', parsed.error.flatten().fieldErrors);
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: user.toSafeObject() });
});

const logout = asyncHandler(async (req, res) => {
  // Stateless JWT — logout is a client-side action (discard the token).
  // Endpoint exists so the frontend has a consistent place to call.
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

module.exports = { register, login, logout, me };
