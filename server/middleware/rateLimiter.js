const rateLimit = require('express-rate-limit');

// Auth endpoints: stricter, to slow down credential stuffing / brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

// AI + upload endpoints: looser, but still bounded since each call has a real cost
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please slow down.' },
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again shortly.' },
});

module.exports = { authLimiter, aiLimiter, uploadLimiter };
