const asyncHandler = require('../utils/asyncHandler');
const analyticsEngine = require('../services/analytics/analyticsEngine');
const { generateDashboardInsights } = require('../services/ai/insightService');

function rangeFromQuery(req) {
  return analyticsEngine.resolveDateRange({
    preset: req.query.preset || 'this_month',
    from: req.query.from,
    to: req.query.to,
  });
}

/** GET /api/analytics/overview — the top-level dashboard cards + AI insights. */
const getOverview = asyncHandler(async (req, res) => {
  const current = rangeFromQuery(req);
  const previous = analyticsEngine.previousPeriodOf(current);

  const [currentTx, previousTx] = await Promise.all([
    analyticsEngine.fetchTransactions(req.user._id, current),
    analyticsEngine.fetchTransactions(req.user._id, previous),
  ]);

  const currentTotals = analyticsEngine.computeTotals(currentTx);
  const previousTotals = analyticsEngine.computeTotals(previousTx);
  const growth = analyticsEngine.computeGrowth(currentTotals, previousTotals);
  const monthlySeries = analyticsEngine.computeMonthlySeries(currentTx);

  let insights = [];
  try {
    insights = await generateDashboardInsights(req.user._id, req.user.currency);
  } catch (err) {
    console.error('[analyticsController] insight generation failed:', err.message);
  }

  res.json({
    success: true,
    range: current,
    current: currentTotals,
    previous: previousTotals,
    growth,
    monthlySeries,
    insights,
  });
});

/** GET /api/analytics/revenue */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const range = rangeFromQuery(req);
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  const revenueTx = tx.filter((t) => t.type === 'revenue');

  res.json({
    success: true,
    range,
    total: analyticsEngine.computeTotals(tx).revenue,
    monthlySeries: analyticsEngine.computeMonthlySeries(tx).map((m) => ({ period: m.period, revenue: m.revenue })),
    byCategory: analyticsEngine.computeCategoryBreakdown(tx, 'revenue'),
    topCustomers: analyticsEngine.computeTopEntities(tx, 'customer', 'revenue', 10),
    transactionCount: revenueTx.length,
  });
});

/** GET /api/analytics/expenses */
const getExpenseAnalytics = asyncHandler(async (req, res) => {
  const range = rangeFromQuery(req);
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  const expenseTx = tx.filter((t) => t.type === 'expense');

  res.json({
    success: true,
    range,
    total: analyticsEngine.computeTotals(tx).expenses,
    monthlySeries: analyticsEngine.computeMonthlySeries(tx).map((m) => ({ period: m.period, expenses: m.expenses })),
    byCategory: analyticsEngine.computeCategoryBreakdown(tx, 'expense'),
    topVendors: analyticsEngine.computeTopEntities(tx, 'vendor', 'expense', 10),
    transactionCount: expenseTx.length,
  });
});

/** GET /api/analytics/profit */
const getProfitAnalytics = asyncHandler(async (req, res) => {
  const range = rangeFromQuery(req);
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  const totals = analyticsEngine.computeTotals(tx);

  res.json({
    success: true,
    range,
    revenue: totals.revenue,
    expenses: totals.expenses,
    profit: totals.profit,
    margin: totals.margin,
    monthlySeries: analyticsEngine.computeMonthlySeries(tx),
  });
});

/** GET /api/analytics/trends */
const getTrends = asyncHandler(async (req, res) => {
  const range = rangeFromQuery(req);
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  res.json({ success: true, range, monthlySeries: analyticsEngine.computeMonthlySeries(tx) });
});

/** GET /api/analytics/categories */
const getCategories = asyncHandler(async (req, res) => {
  const range = rangeFromQuery(req);
  const tx = await analyticsEngine.fetchTransactions(req.user._id, range);
  res.json({
    success: true,
    range,
    expenseCategories: analyticsEngine.computeCategoryBreakdown(tx, 'expense'),
    revenueCategories: analyticsEngine.computeCategoryBreakdown(tx, 'revenue'),
  });
});

module.exports = {
  getOverview,
  getRevenueAnalytics,
  getExpenseAnalytics,
  getProfitAnalytics,
  getTrends,
  getCategories,
};
