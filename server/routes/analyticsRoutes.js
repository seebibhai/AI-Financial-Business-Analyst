const express = require('express');
const {
  getOverview,
  getRevenueAnalytics,
  getExpenseAnalytics,
  getProfitAnalytics,
  getTrends,
  getCategories,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/overview', getOverview);
router.get('/revenue', getRevenueAnalytics);
router.get('/expenses', getExpenseAnalytics);
router.get('/profit', getProfitAnalytics);
router.get('/trends', getTrends);
router.get('/categories', getCategories);

module.exports = router;
