const express = require('express');
const {
  forecastRevenue,
  forecastExpenses,
  forecastProfit,
  forecastHistory,
} = require('../controllers/forecastController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/revenue', aiLimiter, forecastRevenue);
router.post('/expenses', aiLimiter, forecastExpenses);
router.post('/profit', aiLimiter, forecastProfit);
router.get('/history', forecastHistory);

module.exports = router;
